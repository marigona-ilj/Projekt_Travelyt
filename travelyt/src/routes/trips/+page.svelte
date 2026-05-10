<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import TripCard from '$lib/components/TripCard.svelte';
	import { onMount } from 'svelte';

	let trips = [];
	let loading = true;
	let error = '';
	let showNewTripForm = false;
	let newTrip = {
		title: '',
		destination: '',
		startDate: '',
		endDate: '',
		description: ''
	};
	let formLoading = false;

	onMount(async () => {
		await fetchTrips();
	});

	async function fetchTrips() {
		try {
			const response = await fetch('/api/trips');
			const data = await response.json();
			if (data.success) {
				trips = data.trips;
			} else {
				error = data.error || 'Failed to load trips';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function createTrip() {
		if (!newTrip.title || !newTrip.destination || !newTrip.startDate || !newTrip.endDate) {
			error = 'Please fill in all required fields';
			return;
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newTrip)
			});

			const data = await response.json();

			if (data.success) {
				newTrip = {
					title: '',
					destination: '',
					startDate: '',
					endDate: '',
					description: ''
				};
				showNewTripForm = false;
				await fetchTrips();
			} else {
				error = data.error || 'Failed to create trip';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			formLoading = false;
		}
	}

	function openTrip(tripId) {
		goto(`/trips/${tripId}`);
	}
</script>

<Header />

<main class="max-w-6xl mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-4xl font-bold text-gray-800">My Trips</h1>
			<p class="text-gray-600 mt-2">Plan and manage your travel adventures</p>
		</div>
		<button
			on:click={() => (showNewTripForm = !showNewTripForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
		>
			+ New Trip
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if showNewTripForm}
		<div class="bg-white rounded-lg shadow-md p-6 mb-8">
			<h2 class="text-2xl font-bold mb-4 text-gray-800">Create New Trip</h2>
			<form on:submit|preventDefault={createTrip}>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 mb-1">Trip Title</label>
						<input
							type="text"
							id="title"
							bind:value={newTrip.title}
							placeholder="e.g., Summer Europe 2024"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
					<div>
						<label for="dest" class="block text-sm font-medium text-gray-700 mb-1">Destination</label>
						<input
							type="text"
							id="dest"
							bind:value={newTrip.destination}
							placeholder="e.g., Paris, France"
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label for="start" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
						<input
							type="date"
							id="start"
							bind:value={newTrip.startDate}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
					<div>
						<label for="end" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
						<input
							type="date"
							id="end"
							bind:value={newTrip.endDate}
							class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							required
						/>
					</div>
				</div>

				<div class="mb-4">
					<label for="desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						id="desc"
						bind:value={newTrip.description}
						placeholder="Add notes about your trip..."
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
					/>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
					>
						{formLoading ? 'Creating...' : 'Create Trip'}
					</button>
					<button
						type="button"
						on:click={() => (showNewTripForm = false)}
						class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading your trips...</p>
		</div>
	{:else if trips.length === 0}
		<div class="text-center py-12 bg-white rounded-lg shadow">
			<p class="text-gray-600 text-lg">No trips yet. Create your first trip to get started!</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each trips as trip (trip.id)}
				<TripCard {trip} on:click={() => openTrip(trip.id)} />
			{/each}
		</div>
	{/if}
</main>

<style>
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
