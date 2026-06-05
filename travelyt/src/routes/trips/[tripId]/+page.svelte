<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import ActivityList from '$lib/components/ActivityList.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import PackingList from '$lib/components/PackingList.svelte';
	import MemberList from '$lib/components/MemberList.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import TripChecklist from '$lib/components/TripChecklist.svelte';
	import TripWeather from '$lib/components/TripWeather.svelte';
	import TripMap from '$lib/components/TripMap.svelte';
	import DestinationInput from '$lib/components/DestinationInput.svelte';
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';
	import { MapPin, Calendar, Target, Package, Wallet, Users, Images, ClipboardList, FileDown, Cloud, Map } from 'lucide-svelte';

let tripId = $state('');
	let trip = $state(null);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('activities');
	let currentUserId = $state('');
	let isOwner = $derived(trip !== null && trip.createdBy === currentUserId);

	let showEditForm = $state(false);
	let editTrip = $state({ title: '', destination: '', startDate: '', endDate: '', description: '', currency: 'CHF', coverImage: '' });
	let editGeoData = $state(null);
	let editLoading = $state(false);

	function handleEditCoverImage(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			error = 'Image must be under 2 MB';
			event.target.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => { editTrip.coverImage = e.target.result; };
		reader.readAsDataURL(file);
	}

	onMount(async () => {
		tripId = $page.params.tripId;
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		currentUserId = authData.userId || '';
		await fetchTrip();
		const tabParam = $page.url.searchParams.get('tab');
		const validTabs = ['activities', 'packing', 'expenses', 'gallery', 'checklist', 'members', 'weather', 'map'];
		if (tabParam && validTabs.includes(tabParam)) activeTab = tabParam;
	});

	async function fetchTrip() {
		try {
			const response = await fetch(`/api/trips/${tripId}`);
			const data = await response.json();
			if (data.success) {
				trip = data.trip;
			} else {
				error = data.error || 'Failed to load trip';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	function openEditForm() {
		editTrip = {
			title: trip.title,
			destination: trip.destination,
			startDate: trip.startDate ? new Date(trip.startDate).toISOString().split('T')[0] : '',
			endDate: trip.endDate ? new Date(trip.endDate).toISOString().split('T')[0] : '',
			description: trip.description || '',
			currency: trip.currency || 'CHF',
			coverImage: trip.coverImage || ''
		};
		editGeoData = trip.latitude != null
			? { latitude: trip.latitude, longitude: trip.longitude, resolvedLocation: trip.resolvedLocation }
			: null;
		showEditForm = true;
	}

	async function updateTrip(event) {
		if (event?.preventDefault) event.preventDefault();
		if (new Date(editTrip.endDate) < new Date(editTrip.startDate)) {
			error = 'End date cannot be before start date';
			return;
		}
		editLoading = true;
		error = '';
		try {
			const response = await fetch(`/api/trips/${tripId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...editTrip, ...editGeoData })
			});
			const data = await response.json();
			if (data.success) {
				showEditForm = false;
				await fetchTrip();
			} else {
				error = data.error || 'Failed to update trip';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			editLoading = false;
		}
	}

	async function updateCurrency(newCurrency) {
		try {
			const response = await fetch(`/api/trips/${tripId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: trip.title,
					destination: trip.destination,
					startDate: new Date(trip.startDate).toISOString().split('T')[0],
					endDate: new Date(trip.endDate).toISOString().split('T')[0],
					description: trip.description || '',
					currency: newCurrency,
					coverImage: trip.coverImage || ''
				})
			});
			const data = await response.json();
			if (data.success) trip = { ...trip, currency: newCurrency };
		} catch {
			// non-critical
		}
	}

	async function deleteTrip() {
		if (confirm('Are you sure you want to delete this trip? This cannot be undone.')) {
			try {
				const response = await fetch(`/api/trips/${tripId}`, {
					method: 'DELETE'
				});

				const data = await response.json();
				if (data.success) {
					goto('/trips');
				} else {
					error = data.error || 'Failed to delete trip';
				}
			} catch (err) {
				error = 'Network error';
			}
		}
	}
</script>

<Header />

<main class="max-w-6xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600 dark:text-gray-300">Loading trip...</p>
		</div>
	{:else if trip}
		<div class="mb-8">
			<div class="flex justify-between items-start mb-4">
				<div>
					<h1 class="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">{trip.title}</h1>
					<p class="text-lg text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1"><MapPin size={18} /> {trip.destination}</p>
					<p class="text-gray-600 dark:text-gray-300 flex items-center gap-1">
						<Calendar size={16} /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)} ({daysBetween(
							trip.startDate,
							trip.endDate
						)} days)
					</p>
				</div>
			<div class="flex gap-2 flex-wrap">
					<a
						href="/trips/{tripId}/print"
						target="_blank"
						class="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg text-sm"
					>
						<FileDown size={15} />
						Export PDF
					</a>
					{#if isOwner}
						<button
							onclick={openEditForm}
							class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg"
						>
							Edit Trip
						</button>
					{/if}
					{#if isOwner}
						<button
							onclick={deleteTrip}
							class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
						>
							Delete Trip
						</button>
					{/if}
				</div>
			</div>

			{#if trip.description}
				<p class="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">{trip.description}</p>
			{/if}
		</div>

		<!-- Edit form -->
		{#if showEditForm}
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6 mb-8 border border-blue-200 dark:border-blue-800">
				<h2 class="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Edit Trip</h2>
				<form onsubmit={updateTrip}>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label for="edit-title" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Trip Title</label>
							<input
								type="text"
								id="edit-title"
								bind:value={editTrip.title}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
								required
							/>
						</div>
						<div>
							<label for="edit-dest" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Destination</label>
							<DestinationInput
								bind:value={editTrip.destination}
								onlocationselect={(loc) => (editGeoData = loc)}
								inputClass="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
							/>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label for="edit-start" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Start Date</label>
							<input
								type="date"
								id="edit-start"
								bind:value={editTrip.startDate}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
								required
							/>
						</div>
						<div>
							<label for="edit-end" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">End Date</label>
							<input
								type="date"
								id="edit-end"
								bind:value={editTrip.endDate}
								min={editTrip.startDate || ''}
								class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
								required
							/>
						</div>
					</div>
					<div class="mb-4">
						<label for="edit-desc" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
						<textarea
							id="edit-desc"
							bind:value={editTrip.description}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
						></textarea>
					</div>
					<div class="mb-4">
						<label for="edit-cover" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cover Image <span class="text-gray-400 font-normal">(optional)</span></label>
						{#if editTrip.coverImage}
							<div class="relative mb-2">
								<img src={editTrip.coverImage} alt="Current cover" class="h-28 w-full object-cover rounded-lg" />
								<button
									type="button"
									onclick={() => (editTrip.coverImage = '')}
									class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded"
								>
									Remove
								</button>
							</div>
						{/if}
						<input
							type="file"
							id="edit-cover"
							accept="image/*"
							onchange={handleEditCoverImage}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-600 dark:text-gray-300 dark:bg-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
						/>
					</div>

					<div class="flex gap-2">
						<button
							type="submit"
							disabled={editLoading}
							class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
						>
							{editLoading ? 'Saving...' : 'Save Changes'}
						</button>
						<button
							type="button"
							onclick={() => (showEditForm = false)}
							class="bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded-lg"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="mb-6">
			<div class="flex border-b border-gray-300 dark:border-gray-700 flex-wrap">
				{#each ['activities', 'packing', 'expenses', 'gallery', 'checklist', 'members', 'weather', 'map'] as tab}
					<button
						onclick={() => (activeTab = tab)}
						class="py-2 px-4 font-semibold {activeTab === tab
							? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
							: 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'}"
					>
						{#if tab === 'activities'}
							<span class="flex items-center gap-1"><Target size={15} /> Activities</span>
						{:else if tab === 'packing'}
							<span class="flex items-center gap-1"><Package size={15} /> Packing</span>
						{:else if tab === 'expenses'}
							<span class="flex items-center gap-1"><Wallet size={15} /> Budget</span>
						{:else if tab === 'gallery'}
							<span class="flex items-center gap-1"><Images size={15} /> Gallery</span>
						{:else if tab === 'checklist'}
							<span class="flex items-center gap-1"><ClipboardList size={15} /> Checklist</span>
						{:else if tab === 'weather'}
							<span class="flex items-center gap-1"><Cloud size={15} /> Weather</span>
						{:else if tab === 'map'}
							<span class="flex items-center gap-1"><Map size={15} /> Map</span>
						{:else}
							<span class="flex items-center gap-1"><Users size={15} /> Members</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Tab Content -->
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6">
			{#if activeTab === 'activities'}
				<ActivityList {tripId} startDate={trip.startDate} endDate={trip.endDate} />
			{:else if activeTab === 'packing'}
				<PackingList {tripId} />
			{:else if activeTab === 'expenses'}
				<ExpenseList {tripId} {currentUserId} currency={trip.currency || 'CHF'} oncurrencychange={updateCurrency} />
			{:else if activeTab === 'gallery'}
				<Gallery {tripId} {currentUserId} />
			{:else if activeTab === 'checklist'}
				<TripChecklist {tripId} />
			{:else if activeTab === 'members'}
				<MemberList {tripId} {isOwner} />
			{:else if activeTab === 'weather'}
				<TripWeather latitude={trip.latitude} longitude={trip.longitude} resolvedLocation={trip.resolvedLocation} startDate={trip.startDate} endDate={trip.endDate} />
			{:else if activeTab === 'map'}
				<TripMap {tripId} centerLat={trip.latitude} centerLon={trip.longitude} />
			{/if}
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
