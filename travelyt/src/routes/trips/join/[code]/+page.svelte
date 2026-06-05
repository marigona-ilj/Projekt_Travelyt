<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Plane, MapPin, Calendar } from 'lucide-svelte';

	let status = $state('loading'); // loading | confirm | joining | error
	let trip = $state(null);
	let errorMsg = $state('');
	let code = $state('');

	onMount(async () => {
		code = $page.params.code;

		try {
			const authRes = await fetch('/api/auth');
			const authData = await authRes.json();

			if (!authData.authenticated) {
				window.location.href = `/auth?redirect=/trips/join/${code}`;
				return;
			}

			const infoRes = await fetch(`/api/trips/join/${code}`);
			const infoData = await infoRes.json();

			if (!infoData.success) {
				status = 'error';
				errorMsg = infoData.error || 'Invalid or expired invite link.';
				return;
			}

			trip = infoData.trip;
			status = 'confirm';
		} catch (err) {
			status = 'error';
			errorMsg = 'Something went wrong. Please try again.';
			console.error('[join] unexpected error:', err);
		}
	});

	async function joinTrip() {
		status = 'joining';
		try {
			const res = await fetch(`/api/trips/join/${code}`, { method: 'POST' });
			const data = await res.json();
			if (data.success) {
				window.location.href = `/trips/${data.tripId}`;
			} else {
				status = 'error';
				errorMsg = data.error || 'Could not join the trip.';
			}
		} catch {
			status = 'error';
			errorMsg = 'Something went wrong. Please try again.';
		}
	}

	function formatDate(d) {
		return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
	<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-sm w-full text-center">
		<div class="text-blue-600 flex justify-center mb-4">
			<Plane size={36} />
		</div>

		{#if status === 'loading'}
			<p class="text-gray-500 dark:text-gray-400 text-sm">Loading invite…</p>
			<div class="flex justify-center mt-4">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>

		{:else if status === 'confirm' && trip}
			<p class="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">You're invited</p>
			<h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">{trip.title}</h1>
			<p class="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 text-sm mb-1">
				<MapPin size={13} />{trip.destination}
			</p>
			{#if trip.startDate && trip.endDate}
				<p class="text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1 text-xs mb-6">
					<Calendar size={12} />
					{formatDate(trip.startDate)} – {formatDate(trip.endDate)}
				</p>
			{:else}
				<div class="mb-6"></div>
			{/if}
			<p class="text-sm text-gray-600 dark:text-gray-300 mb-6">
				Do you want to join this trip?
			</p>
			<div class="flex flex-col gap-2">
				<button
					onclick={joinTrip}
					class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition"
				>
					Join Trip
				</button>
				<a
					href="/"
					class="w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm transition text-center"
				>
					Decline
				</a>
			</div>

		{:else if status === 'joining'}
			<h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
				Joining "{trip?.title}"…
			</h1>
			<div class="flex justify-center mt-4">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>

		{:else if status === 'error'}
			<h1 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Could not join trip</h1>
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-6">{errorMsg}</p>
			<a
				href="/trips"
				class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm"
			>
				Go to My Trips
			</a>
		{/if}
	</div>
</div>
