<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { Plane } from 'lucide-svelte';

	let status = $state('loading');
	let tripTitle = $state('');
	let tripDestination = $state('');
	let errorMsg = $state('');

	onMount(async () => {
		const code = $page.params.code;

		// Check auth
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();

		if (!authData.authenticated) {
			goto(`/auth?redirect=/trips/join/${code}`);
			return;
		}

		// Fetch trip info
		const infoRes = await fetch(`/api/trips/join/${code}`);
		const infoData = await infoRes.json();

		if (!infoData.success) {
			status = 'error';
			errorMsg = infoData.error;
			return;
		}

		tripTitle = infoData.trip.title;
		tripDestination = infoData.trip.destination;
		status = 'joining';

		// Join
		const joinRes = await fetch(`/api/trips/join/${code}`, { method: 'POST' });
		const joinData = await joinRes.json();

		if (joinData.success) {
			goto(`/trips/${joinData.tripId}`);
		} else {
			status = 'error';
			errorMsg = joinData.error;
		}
	});
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
		<div class="text-blue-600 flex justify-center mb-4">
			<Plane size={36} />
		</div>

		{#if status === 'loading' || status === 'joining'}
			<h1 class="text-xl font-bold text-gray-800 mb-2">
				{status === 'joining' && tripTitle ? `Joining "${tripTitle}"` : 'Loading invite...'}
			</h1>
			{#if tripDestination}
				<p class="text-gray-500 text-sm mb-4">{tripDestination}</p>
			{/if}
			<div class="flex justify-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			</div>
		{:else if status === 'error'}
			<h1 class="text-xl font-bold text-gray-800 mb-2">Invalid invite link</h1>
			<p class="text-gray-500 text-sm mb-6">{errorMsg}</p>
			<a href="/trips" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg text-sm">
				Go to My Trips
			</a>
		{/if}
	</div>
</div>
