<script>
	import { onMount } from 'svelte';
	import { Plane, MapPin, Calendar, Check, X } from 'lucide-svelte';

	let invites = $state([]);
	let loading = $state(true);
	let processing = $state({}); // inviteId → 'accepting' | 'declining' | 'done'
	let allHandled = $derived(invites.length > 0 && invites.every((i) => processing[i.inviteId] === 'done'));

	function formatDate(d) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	async function accept(invite) {
		processing = { ...processing, [invite.inviteId]: 'accepting' };
		try {
			const res = await fetch('/api/user/pending-invites', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inviteId: invite.inviteId })
			});
			const data = await res.json();
			if (data.success) {
				processing = { ...processing, [invite.inviteId]: 'done' };
				// Navigate directly to the trip if it's the only invite
				if (invites.length === 1) {
					window.location.href = `/trips/${data.tripId}`;
				}
			}
		} catch {
			processing = { ...processing, [invite.inviteId]: null };
		}
	}

	async function decline(invite) {
		processing = { ...processing, [invite.inviteId]: 'declining' };
		try {
			await fetch('/api/user/pending-invites', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inviteId: invite.inviteId })
			});
			processing = { ...processing, [invite.inviteId]: 'done' };
		} catch {
			processing = { ...processing, [invite.inviteId]: null };
		}
	}

	onMount(async () => {
		try {
			const res = await fetch('/api/user/pending-invites');
			const data = await res.json();
			if (data.success) invites = data.invites;
			if (data.invites?.length === 0) window.location.href = '/';
		} catch {
			window.location.href = '/';
		} finally {
			loading = false;
		}
	});
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-10">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<div class="text-blue-600 flex justify-center mb-3">
				<Plane size={36} />
			</div>
			<h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">You've been invited!</h1>
			<p class="text-gray-500 dark:text-gray-400 text-sm mt-1">
				Choose which trips you'd like to join.
			</p>
		</div>

		{#if loading}
			<div class="flex justify-center py-10">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else}
			<div class="flex flex-col gap-4">
				{#each invites as invite (invite.inviteId)}
					{@const state = processing[invite.inviteId]}
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 transition-opacity {state === 'done' ? 'opacity-50' : ''}">
						{#if state === 'done'}
							<div class="flex items-center gap-2 text-sm font-medium {processing[invite.inviteId] === 'done' && !Object.values(processing).includes('accepting') ? 'text-gray-400' : 'text-gray-400'}">
								<Check size={16} class="text-green-500" />
								{#if state === 'done'}
									Handled
								{/if}
							</div>
						{:else}
							<h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">{invite.tripTitle}</h2>
							<p class="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-sm mb-1">
								<MapPin size={12} />{invite.tripDestination}
							</p>
							{#if invite.tripStartDate}
								<p class="text-gray-400 dark:text-gray-500 flex items-center gap-1 text-xs mb-4">
									<Calendar size={12} />
									{formatDate(invite.tripStartDate)} – {formatDate(invite.tripEndDate)}
								</p>
							{:else}
								<div class="mb-4"></div>
							{/if}
							<div class="flex gap-2">
								<button
									onclick={() => accept(invite)}
									disabled={!!state}
									class="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl transition text-sm"
								>
									{#if state === 'accepting'}
										<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									{:else}
										<Check size={15} /> Join
									{/if}
								</button>
								<button
									onclick={() => decline(invite)}
									disabled={!!state}
									class="flex-1 flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 font-medium py-2 rounded-xl transition text-sm"
								>
									{#if state === 'declining'}
										<div class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
									{:else}
										<X size={15} /> Decline
									{/if}
								</button>
							</div>
						{/if}
					</div>
				{/each}

				{#if allHandled}
					<a
						href="/"
						class="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition"
					>
						Continue to Dashboard
					</a>
				{/if}
			</div>
		{/if}
	</div>
</div>
