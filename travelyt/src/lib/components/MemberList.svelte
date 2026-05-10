<script>
	import { onMount } from 'svelte';

	let { tripId, isOwner } = $props();

	let members = $state([]);
	let loading = $state(true);
	let error = $state('');
	let inviteEmail = $state('');
	let inviteLoading = $state(false);
	let inviteError = $state('');
	let inviteSuccess = $state('');

	onMount(async () => {
		await fetchMembers();
	});

	async function fetchMembers() {
		try {
			const response = await fetch(`/api/trips/${tripId}/members`);
			const data = await response.json();
			if (data.success) {
				members = data.members;
			} else {
				error = data.error || 'Failed to load members';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
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
				await fetchMembers();
			} else {
				inviteError = data.error || 'Failed to add member';
			}
		} catch (err) {
			inviteError = 'Network error';
		} finally {
			inviteLoading = false;
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
		} catch (err) {
			error = 'Network error';
		}
	}
</script>

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800">Trip Members</h2>
		<span class="text-sm text-gray-500">{members.length} {members.length === 1 ? 'person' : 'people'}</span>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
	{/if}

	{#if isOwner}
		<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
			<h3 class="text-sm font-semibold text-blue-800 mb-3">Invite someone by email</h3>
			<form onsubmit={inviteMember} class="flex gap-2">
				<input
					type="email"
					bind:value={inviteEmail}
					placeholder="friend@email.com"
					class="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
				<p class="text-red-600 text-sm mt-2">{inviteError}</p>
			{/if}
			{#if inviteSuccess}
				<p class="text-green-600 text-sm mt-2">✓ {inviteSuccess}</p>
			{/if}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
			<p class="text-gray-500 text-sm">Loading members...</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each members as member}
				<div class="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
							{member.name.charAt(0).toUpperCase()}
						</div>
						<div>
							<p class="font-semibold text-gray-800 text-sm">{member.name}</p>
							<p class="text-gray-500 text-xs">{member.email}</p>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<span class="text-xs font-semibold px-2 py-1 rounded-full {member.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}">
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

	{#if !loading && members.length === 1}
		<p class="text-center text-gray-400 text-sm mt-6">
			This is a solo trip. Add friends to plan together.
		</p>
	{/if}
</div>
