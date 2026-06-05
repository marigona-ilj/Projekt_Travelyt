<script>
	import { onMount } from 'svelte';
	import { Copy, Link, Trash2, UserPlus } from 'lucide-svelte';

	let { tripId, isOwner } = $props();

	let members = $state([]);
	let pendingInvites = $state([]);
	let contacts = $state([]);
	let loading = $state(true);
	let error = $state('');
	let inviteEmail = $state('');
	let inviteLoading = $state(false);
	let inviteError = $state('');
	let inviteSuccess = $state('');
	let inviteSuccessIsPending = $state(false);
	let inviteCode = $state('');
	let inviteLinkLoading = $state(false);
	let copied = $state(false);
	// Per-contact loading state: userId → true/false
	let contactAdding = $state({});

	let inviteLink = $derived(inviteCode ? `${window?.location?.origin}/trips/join/${inviteCode}` : '');

	// Contacts not already in this trip
	let availableContacts = $derived(
		contacts.filter((c) => !members.some((m) => m.userId === c.userId))
	);

	// Deterministic avatar colour from userId
	const AVATAR_COLORS = [
		'bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
		'bg-orange-500', 'bg-indigo-500', 'bg-rose-500', 'bg-cyan-600'
	];
	function avatarColor(userId) {
		return AVATAR_COLORS[userId.charCodeAt(userId.length - 1) % AVATAR_COLORS.length];
	}
	function initials(name) {
		return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
	}

	onMount(async () => {
		await Promise.all([fetchMembers(), fetchContacts()]);
	});

	async function fetchMembers() {
		try {
			const response = await fetch(`/api/trips/${tripId}/members`);
			const data = await response.json();
			if (data.success) {
				members = data.members;
				pendingInvites = data.pendingInvites ?? [];
			} else {
				error = data.error || 'Failed to load members';
			}
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	async function fetchContacts() {
		try {
			const res = await fetch('/api/contacts');
			const data = await res.json();
			if (data.success) contacts = data.contacts;
		} catch {
			// non-critical, ignore
		}
	}

	async function addContactDirectly(contact) {
		contactAdding = { ...contactAdding, [contact.userId]: true };
		inviteError = '';
		inviteSuccess = '';
		try {
			const res = await fetch(`/api/trips/${tripId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: contact.email })
			});
			const data = await res.json();
			if (data.success) {
				inviteSuccess = `${contact.name} added to the trip.`;
				await fetchMembers();
			} else {
				inviteError = data.error || 'Failed to add member';
			}
		} catch {
			inviteError = 'Network error';
		} finally {
			contactAdding = { ...contactAdding, [contact.userId]: false };
		}
	}

	async function inviteMember(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!inviteEmail.trim()) return;

		inviteLoading = true;
		inviteError = '';
		inviteSuccess = '';

		try {
			const response = await fetch(`/api/trips/${tripId}/members`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: inviteEmail.trim() })
			});

			const data = await response.json();

			if (data.success) {
				inviteEmail = '';
				inviteSuccess = data.message;
				inviteSuccessIsPending = data.pending ?? false;
				await fetchMembers();
			} else {
				inviteError = data.error || 'Failed to add member';
			}
		} catch {
			inviteError = 'Network error';
		} finally {
			inviteLoading = false;
		}
	}

	async function generateInviteLink() {
		inviteLinkLoading = true;
		try {
			const res = await fetch(`/api/trips/${tripId}/invite`);
			const data = await res.json();
			if (data.success) inviteCode = data.code;
		} catch {
			// silently ignore
		} finally {
			inviteLinkLoading = false;
		}
	}

	async function revokeInviteLink() {
		if (!confirm('Revoke the invite link? Existing links will no longer work.')) return;
		try {
			await fetch(`/api/trips/${tripId}/invite`, { method: 'DELETE' });
			inviteCode = '';
		} catch {
			// silently ignore
		}
	}

	async function copyLink() {
		await navigator.clipboard.writeText(inviteLink);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function cancelInvite(inviteId) {
		try {
			await fetch(`/api/trips/${tripId}/invites/${inviteId}`, { method: 'DELETE' });
			pendingInvites = pendingInvites.filter((i) => i.id !== inviteId);
		} catch {
			// silently ignore
		}
	}

	async function removeMember(memberId) {
		if (!confirm('Remove this member from the trip?')) return;
		try {
			const response = await fetch(`/api/trips/${tripId}/members/${memberId}`, {
				method: 'DELETE'
			});
			const data = await response.json();
			if (data.success) {
				await fetchMembers();
			} else {
				error = data.error || 'Failed to remove member';
			}
		} catch {
			error = 'Network error';
		}
	}
</script>

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Trip Members</h2>
		<span class="text-sm text-gray-500 dark:text-gray-400">{members.length} {members.length === 1 ? 'person' : 'people'}</span>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">{error}</div>
	{/if}

	<!-- Contacts quick-add -->
	{#if availableContacts.length > 0}
		<div class="mb-5">
			<p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
				<UserPlus size={13} /> Add from contacts
			</p>
			<div class="flex flex-wrap gap-2">
				{#each availableContacts as contact (contact.userId)}
					{@const busy = contactAdding[contact.userId]}
					<button
						onclick={() => addContactDirectly(contact)}
						disabled={busy}
						title={contact.email}
						class="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition
							{busy
								? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
								: 'border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'}"
					>
						<span class="w-7 h-7 rounded-full {avatarColor(contact.userId)} text-white text-[11px] font-bold flex items-center justify-center shrink-0">
							{initials(contact.name)}
						</span>
						<span class="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
							{contact.name.split(' ')[0]}
						</span>
						{#if busy}
							<span class="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Invite by email -->
	<div class="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
		<h3 class="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
			{availableContacts.length > 0 ? 'Or invite by email' : 'Invite someone by email'}
		</h3>
		<form onsubmit={inviteMember} class="flex gap-2">
			<input
				type="email"
				bind:value={inviteEmail}
				placeholder="friend@email.com"
				class="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
			/>
			<button
				type="submit"
				disabled={inviteLoading}
				class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg text-sm"
			>
				{inviteLoading ? 'Adding...' : 'Add'}
			</button>
		</form>
		{#if inviteError}
			<p class="text-red-600 dark:text-red-400 text-sm mt-2">{inviteError}</p>
		{/if}
		{#if inviteSuccess}
			<p class="text-sm mt-2 {inviteSuccessIsPending
				? 'text-amber-600 dark:text-amber-400'
				: 'text-green-600 dark:text-green-400'}">
				{inviteSuccessIsPending ? '⏳' : '✓'} {inviteSuccess}
			</p>
		{/if}
	</div>

	<!-- Invite link -->
	<div class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
		<h3 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
			<Link size={14} /> Invite via link
		</h3>
		{#if inviteCode}
			<div class="flex gap-2 mb-2">
				<input
					type="text"
					value={inviteLink}
					readonly
					class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700"
				/>
				<button
					onclick={copyLink}
					class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition {copied ? 'bg-green-100 text-green-700' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}"
				>
					<Copy size={14} />
					{copied ? 'Copied!' : 'Copy'}
				</button>
			</div>
			{#if isOwner}
				<button onclick={revokeInviteLink} class="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition">
					<Trash2 size={12} /> Revoke link
				</button>
			{/if}
		{:else}
			<button
				onclick={generateInviteLink}
				disabled={inviteLinkLoading}
				class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg text-sm transition"
			>
				{inviteLinkLoading ? 'Generating...' : 'Generate invite link'}
			</button>
		{/if}
	</div>

	<!-- Member list -->
	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
			<p class="text-gray-500 dark:text-gray-400 text-sm">Loading members...</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each members as member}
				<div class="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg px-4 py-3">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full {avatarColor(member.userId)} flex items-center justify-center text-white font-bold text-sm">
							{initials(member.name)}
						</div>
						<div>
							<p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{member.name}</p>
							<p class="text-gray-500 dark:text-gray-400 text-xs">{member.email}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs font-semibold px-2 py-1 rounded-full {member.role === 'owner' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}">
							{member.role === 'owner' ? 'Owner' : 'Member'}
						</span>
						{#if isOwner && member.role !== 'owner'}
							<button
								onclick={() => removeMember(member.userId)}
								class="text-red-400 hover:text-red-600 text-xs font-semibold ml-1"
							>
								Remove
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if !loading && members.length === 1 && pendingInvites.length === 0}
		<p class="text-center text-gray-400 dark:text-gray-500 text-sm mt-6">
			This is a solo trip. Add friends to plan together.
		</p>
	{/if}

	<!-- Pending invites -->
	{#if pendingInvites.length > 0}
		<div class="mt-5">
			<p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Pending invites</p>
			<ul class="space-y-2">
				{#each pendingInvites as inv (inv.id)}
					<li class="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2.5">
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center shrink-0">
								<span class="text-amber-600 dark:text-amber-300 text-xs font-bold">?</span>
							</div>
							<div>
								<p class="text-sm font-medium text-gray-700 dark:text-gray-200">{inv.email}</p>
								<p class="text-xs text-amber-600 dark:text-amber-400">Invited · awaiting registration</p>
							</div>
						</div>
						<button
							onclick={() => cancelInvite(inv.id)}
							class="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300 font-medium transition"
						>
							Cancel
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
