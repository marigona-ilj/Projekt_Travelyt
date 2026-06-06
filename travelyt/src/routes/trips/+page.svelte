<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import TripCard from '$lib/components/TripCard.svelte';
	import DestinationInput from '$lib/components/DestinationInput.svelte';
	import { onMount } from 'svelte';
	import { Plane, Users, Receipt, CalendarDays, PackageCheck, Plus, X } from 'lucide-svelte';

	let trips = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewTripForm = $state(false);

	function emptyLeg() {
		return { destination: '', startDate: '', endDate: '', latitude: null, longitude: null, resolvedLocation: '' };
	}

	const dateMin = `${new Date().getFullYear() - 5}-01-01`;
	const dateMax = `${new Date().getFullYear() + 10}-12-31`;
	const minYear = new Date().getFullYear() - 5;
	const maxYear = new Date().getFullYear() + 10;

	function validateDateYear(value, label) {
		if (!value) return;
		const match = value.match(/^(\d{4,})-\d{2}-\d{2}$/);
		if (!match) return;
		const year = parseInt(match[1]);
		if (year < 1000) return; // still being typed (browser pads with leading zeros)
		if (year < minYear || year > maxYear) {
			error = `${label}: year must be between ${minYear} and ${maxYear}`;
		} else {
			error = '';
		}
	}

	let newTrip = $state({ title: '', description: '', currency: 'CHF', coverImage: '' });
	let newLegs = $state([emptyLeg()]);
	let formLoading = $state(false);

	function addLeg() {
		newLegs = [...newLegs, emptyLeg()];
	}

	function removeLeg(i) {
		newLegs = newLegs.filter((_, idx) => idx !== i);
	}

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
		if (!newTrip.title) { error = 'Please enter a trip title'; return; }
		for (let i = 0; i < newLegs.length; i++) {
			const leg = newLegs[i];
			if (!leg.destination || !leg.startDate || !leg.endDate) {
				error = `Please fill in all fields for destination ${i + 1}`;
				return;
			}
			if (new Date(leg.endDate) < new Date(leg.startDate)) {
				error = `Destination ${i + 1}: end date cannot be before start date`;
				return;
			}
			const minYear = new Date().getFullYear() - 5;
			const maxYear = new Date().getFullYear() + 10;
			const startYear = new Date(leg.startDate).getFullYear();
			const endYear = new Date(leg.endDate).getFullYear();
			if (startYear < minYear || startYear > maxYear || endYear < minYear || endYear > maxYear) {
				error = `Destination ${i + 1}: year must be between ${minYear} and ${maxYear}`;
				return;
			}
			if (i > 0 && new Date(leg.startDate) < new Date(newLegs[i - 1].endDate)) {
				error = `Destination ${i + 1} start date overlaps with previous leg`;
				return;
			}
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...newTrip, legs: newLegs })
			});

			const data = await response.json();

			if (data.success) {
				newTrip = { title: '', description: '', currency: 'CHF', coverImage: '' };
				newLegs = [emptyLeg()];
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
	let sortOrder = $state('date-asc');
	let filterOpen = $state(false);
	let sortOpen = $state(false);

	const filterLabels = { all: 'All', upcoming: 'Upcoming', ongoing: 'Ongoing', past: 'Past' };
	const sortLabels = { 'date-asc': 'Date ↑', 'date-desc': 'Date ↓', 'name-asc': 'A–Z' };

	function getTripStatus(trip) {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const start = new Date(trip.startDate);
		const end = new Date(trip.endDate);
		if (now > end) return 'past';
		if (now >= start) return 'ongoing';
		return 'upcoming';
	}

	let filteredTrips = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		const result = trips.filter((trip) => {
			const matchesSearch =
				!q ||
				trip.title.toLowerCase().includes(q) ||
				trip.destination.toLowerCase().includes(q);
			const matchesStatus = statusFilter === 'all' || getTripStatus(trip) === statusFilter;
			return matchesSearch && matchesStatus;
		});
		result.sort((a, b) => {
			if (sortOrder === 'name-asc') return a.title.localeCompare(b.title);
			if (sortOrder === 'date-desc') return new Date(b.startDate) - new Date(a.startDate);
			return new Date(a.startDate) - new Date(b.startDate);
		});
		return result;
	});
</script>

{#if filterOpen || sortOpen}
	<div class="fixed inset-0 z-10" role="presentation" onclick={() => { filterOpen = false; sortOpen = false; }}></div>
{/if}

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
			<div class="flex gap-2">
				<!-- Filter dropdown -->
				<div class="relative">
					<button
						onclick={() => { filterOpen = !filterOpen; sortOpen = false; }}
						class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition border {statusFilter !== 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'}"
					>
						Filter: {filterLabels[statusFilter]}
						<svg class="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
					</button>
					{#if filterOpen}
						<div class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
							{#each [['all', 'All'], ['upcoming', 'Upcoming'], ['ongoing', 'Ongoing'], ['past', 'Past']] as [value, label]}
								<button
									onclick={() => { statusFilter = value; filterOpen = false; }}
									class="w-full text-left px-4 py-2 text-sm transition flex items-center justify-between {statusFilter === value ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}"
								>
									{label}
									{#if statusFilter === value}<span>✓</span>{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Sort dropdown -->
				<div class="relative">
					<button
						onclick={() => { sortOpen = !sortOpen; filterOpen = false; }}
						class="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition border bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
					>
						Sort: {sortLabels[sortOrder]}
						<svg class="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
					</button>
					{#if sortOpen}
						<div class="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
							{#each [['date-asc', 'Date ↑'], ['date-desc', 'Date ↓'], ['name-asc', 'A–Z']] as [value, label]}
								<button
									onclick={() => { sortOrder = value; sortOpen = false; }}
									class="w-full text-left px-4 py-2 text-sm transition flex items-center justify-between {sortOrder === value ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}"
								>
									{label}
									{#if sortOrder === value}<span>✓</span>{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
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
			<form onsubmit={createTrip} novalidate>
				<div class="mb-4">
					<label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Trip Title <span class="text-red-500">*</span></label>
					<input
						type="text"
						id="title"
						bind:value={newTrip.title}
						placeholder="e.g., Summer Europe 2024"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>

				<div class="mb-4">
					<div class="flex items-center justify-between mb-1">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Destinations <span class="text-red-500">*</span></label>
						{#if newLegs.length > 1}
							<span class="text-xs text-gray-400 dark:text-gray-500">{newLegs.length} destinations</span>
						{/if}
					</div>
					{#if newLegs.length === 1}
						<p class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-2">
							Travelling to multiple cities? Click <span class="font-semibold">+ Add destination</span> below to add more stops.
						</p>
					{/if}
					<div class="space-y-2">
						{#each newLegs as leg, i}
							<div class="flex gap-2 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
								{#if newLegs.length > 1}
									<div class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-2">{i + 1}</div>
								{/if}
								<div class="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
									<div class="sm:col-span-1">
										<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Destination</p>
										<DestinationInput
											bind:value={leg.destination}
											onlocationselect={(loc) => {
												if (loc) { leg.latitude = loc.latitude; leg.longitude = loc.longitude; leg.resolvedLocation = loc.resolvedLocation; }
												else { leg.latitude = null; leg.longitude = null; leg.resolvedLocation = ''; }
											}}
											inputClass="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
										/>
									</div>
									<div>
										<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">From</p>
										<input
											type="date"
											bind:value={leg.startDate}
											min={dateMin}
											max={dateMax}
											onchange={(e) => validateDateYear(e.target.value, `Destination ${i + 1} start date`)}
											class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
										/>
									</div>
									<div>
										<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">To</p>
										<input
											type="date"
											bind:value={leg.endDate}
											min={leg.startDate || dateMin}
											max={dateMax}
											onchange={(e) => validateDateYear(e.target.value, `Destination ${i + 1} end date`)}
											class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
										/>
									</div>
								</div>
								{#if newLegs.length > 1}
									<button type="button" onclick={() => removeLeg(i)} class="text-gray-400 hover:text-red-500 mt-2 shrink-0 transition">
										<X size={16} />
									</button>
								{/if}
							</div>
						{/each}
						<button
							type="button"
							onclick={addLeg}
							class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-1 py-1 transition"
						>
							<Plus size={15} /> Add destination
						</button>
					</div>
				</div>

				<div class="mb-4">
					<label for="desc" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
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
						onclick={() => { showNewTripForm = false; error = ''; }}
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
		<div class="flex flex-col items-center py-16 px-4">
			<div class="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-5 text-blue-600">
				<Plane size={32} />
			</div>
			<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">No trips yet</h2>
			<p class="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center max-w-sm">
				Create your first trip and start planning — invite friends, track expenses, and more.
			</p>
			<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 w-full max-w-lg">
				{#each [[Users, 'Invite friends'], [Receipt, 'Split expenses'], [CalendarDays, 'Plan activities'], [PackageCheck, 'Packing list']] as [Icon, label]}
					<div class="flex flex-col items-center gap-1.5 bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
						<svelte:component this={Icon} size={18} class="text-blue-500" />
						<span class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center">{label}</span>
					</div>
				{/each}
			</div>
			<button
				onclick={() => (showNewTripForm = true)}
				class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-8 rounded-xl transition text-sm"
			>
				Create your first trip
			</button>
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
