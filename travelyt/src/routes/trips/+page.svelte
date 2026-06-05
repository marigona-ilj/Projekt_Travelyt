<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import TripCard from '$lib/components/TripCard.svelte';
	import DestinationInput from '$lib/components/DestinationInput.svelte';
	import { onMount } from 'svelte';

	let trips = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewTripForm = $state(false);

	let newTrip = $state({
		title: '',
		destination: '',
		startDate: '',
		endDate: '',
		description: '',
		currency: 'CHF',
		coverImage: ''
	});
	let newTripGeoData = $state(null);
	let formLoading = $state(false);

	function handleCoverImage(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			error = 'Image must be under 2 MB';
			event.target.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => { newTrip.coverImage = e.target.result; };
		reader.readAsDataURL(file);
	}

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

	async function createTrip(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!newTrip.title || !newTrip.destination || !newTrip.startDate || !newTrip.endDate) {
			error = 'Please fill in all required fields';
			return;
		}
		if (new Date(newTrip.endDate) < new Date(newTrip.startDate)) {
			error = 'End date cannot be before start date';
			return;
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...newTrip, ...newTripGeoData })
			});

			const data = await response.json();

			if (data.success) {
				newTrip = {
					title: '',
					destination: '',
					startDate: '',
					endDate: '',
					description: '',
					currency: 'CHF',
					coverImage: ''
				};
				newTripGeoData = null;
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

	let searchQuery = $state('');
	let statusFilter = $state('all');

	function getTripStatus(trip) {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const start = new Date(trip.startDate);
		const end = new Date(trip.endDate);
		if (now > end) return 'past';
		if (now >= start) return 'ongoing';
		return 'upcoming';
	}

	let filteredTrips = $derived(
		trips.filter((trip) => {
			const q = searchQuery.trim().toLowerCase();
			const matchesSearch =
				!q ||
				trip.title.toLowerCase().includes(q) ||
				trip.destination.toLowerCase().includes(q);
			const matchesStatus = statusFilter === 'all' || getTripStatus(trip) === statusFilter;
			return matchesSearch && matchesStatus;
		})
	);
</script>

<Header />

<main class="max-w-6xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
	<div class="flex justify-between items-center mb-8">
		<div>
			<h1 class="text-4xl font-bold text-gray-800 dark:text-gray-100">My Trips</h1>
			<p class="text-gray-600 dark:text-gray-300 mt-2">Plan and manage your travel adventures</p>
		</div>
		<button
			onclick={() => (showNewTripForm = !showNewTripForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
		>
			+ New Trip
		</button>
	</div>

	{#if !showNewTripForm && trips.length > 0}
		<div class="flex flex-col sm:flex-row gap-3 mb-6">
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by title or destination..."
				class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
			/>
			<div class="flex gap-1">
				{#each [['all', 'All'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['past', 'Past']] as [value, label]}
					<button
						onclick={() => (statusFilter = value)}
						class="px-3 py-2 rounded-lg text-sm font-semibold transition {statusFilter === value
							? 'bg-blue-600 text-white'
							: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if showNewTripForm}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6 mb-8">
			<h2 class="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">Create New Trip</h2>
			<form onsubmit={createTrip}>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Trip Title</label>
						<input
							type="text"
							id="title"
							bind:value={newTrip.title}
							placeholder="e.g., Summer Europe 2024"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
							required
						/>
					</div>
					<div>
						<label for="dest" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Destination</label>
						<DestinationInput
							bind:value={newTrip.destination}
							onlocationselect={(loc) => (newTripGeoData = loc)}
							inputClass="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					<div>
						<label for="start" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Start Date</label>
						<input
							type="date"
							id="start"
							bind:value={newTrip.startDate}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
							required
						/>
					</div>
					<div>
						<label for="end" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
						<input
							type="date"
							id="end"
							bind:value={newTrip.endDate}
							min={newTrip.startDate || ''}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
							required
						/>
					</div>
				</div>

				<div class="mb-4">
					<label for="desc" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
					<textarea
						id="desc"
						bind:value={newTrip.description}
						placeholder="Add notes about your trip..."
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
					></textarea>
				</div>

				<div class="mb-4">
					<label for="cover" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cover Image <span class="text-gray-400 font-normal">(optional)</span></label>
					<input
						type="file"
						id="cover"
						accept="image/*"
						onchange={handleCoverImage}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 dark:text-gray-300 dark:bg-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
					/>
					{#if newTrip.coverImage}
						<img src={newTrip.coverImage} alt="Preview" class="mt-2 h-28 w-full object-cover rounded-lg" />
					{/if}
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
						onclick={() => (showNewTripForm = false)}
						class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg"
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
			<p class="text-gray-600 dark:text-gray-300">Loading your trips...</p>
		</div>
	{:else if trips.length === 0}
		<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
			<p class="text-gray-600 dark:text-gray-300 text-lg">No trips yet. Create your first trip to get started!</p>
		</div>
	{:else if filteredTrips.length === 0}
		<div class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900">
			<p class="text-gray-600 dark:text-gray-300 text-lg">No trips match your search.</p>
			<button
				onclick={() => { searchQuery = ''; statusFilter = 'all'; }}
				class="mt-3 text-blue-600 hover:underline text-sm"
			>
				Clear filters
			</button>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredTrips as trip (trip.id)}
				<TripCard {trip} onclick={() => openTrip(trip.id)}></TripCard>
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
