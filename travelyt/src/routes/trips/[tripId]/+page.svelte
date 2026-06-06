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
	import TripChat from '$lib/components/TripChat.svelte';
	import DestinationInput from '$lib/components/DestinationInput.svelte';
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';
	import { MapPin, Calendar, Target, Package, Wallet, Users, Images, ClipboardList, FileDown, Cloud, Map, Plus, X } from 'lucide-svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let tripId = $state('');
	let trip = $state(null);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('activities');
	let currentUserId = $state('');
	let currentUserName = $state('');
	let isOwner = $derived(trip !== null && trip.createdBy === currentUserId);

	let tripDestinationLabel = $derived(
		trip?.legs?.length > 1
			? trip.legs.map((l) => l.destination).join(' → ')
			: trip?.destination ?? ''
	);

	let showEditForm = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');
	let editCurrency = $state('CHF');
	let editCoverImage = $state('');
	let editLegs = $state([]);
	let editLoading = $state(false);

	function emptyLeg() {
		return { destination: '', startDate: '', endDate: '', latitude: null, longitude: null, resolvedLocation: '' };
	}

	function addEditLeg() {
		editLegs = [...editLegs, emptyLeg()];
	}

	function removeEditLeg(i) {
		editLegs = editLegs.filter((_, idx) => idx !== i);
	}

	function handleEditCoverImage(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (file.size > 2 * 1024 * 1024) {
			error = 'Image must be under 2 MB';
			event.target.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = (e) => { editCoverImage = e.target.result; };
		reader.readAsDataURL(file);
	}

	onMount(async () => {
		tripId = $page.params.tripId;
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		currentUserId = authData.userId || '';
		currentUserName = authData.user?.name || '';
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
		editTitle = trip.title;
		editDescription = trip.description || '';
		editCurrency = trip.currency || 'CHF';
		editCoverImage = trip.coverImage || '';
		editLegs = (trip.legs ?? []).map((leg) => ({
			destination: leg.destination,
			startDate: String(leg.startDate).split('T')[0],
			endDate: String(leg.endDate).split('T')[0],
			latitude: leg.latitude ?? null,
			longitude: leg.longitude ?? null,
			resolvedLocation: leg.resolvedLocation || ''
		}));
		if (editLegs.length === 0) editLegs = [emptyLeg()];
		showEditForm = true;
	}

	async function updateTrip(event) {
		if (event?.preventDefault) event.preventDefault();
		for (let i = 0; i < editLegs.length; i++) {
			const leg = editLegs[i];
			if (!leg.destination || !leg.startDate || !leg.endDate) {
				error = `Please fill in all fields for destination ${i + 1}`;
				return;
			}
			if (new Date(leg.endDate) < new Date(leg.startDate)) {
				error = `Destination ${i + 1}: end date cannot be before start date`;
				return;
			}
		}
		editLoading = true;
		error = '';
		try {
			const response = await fetch(`/api/trips/${tripId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editTitle,
					description: editDescription,
					currency: editCurrency,
					coverImage: editCoverImage,
					legs: editLegs
				})
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
					description: trip.description || '',
					currency: newCurrency,
					coverImage: trip.coverImage || '',
					legs: trip.legs ?? []
				})
			});
			const data = await response.json();
			if (data.success) trip = { ...trip, currency: newCurrency };
		} catch {
			// non-critical
		}
	}

	let deleteTripDialogOpen = $state(false);

	async function confirmDeleteTrip() {
		deleteTripDialogOpen = false;
		try {
			const response = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
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
</script>

<Header />

<ConfirmDialog
	open={deleteTripDialogOpen}
	title="Delete trip?"
	message="This will permanently delete the trip and all its data."
	confirmLabel="Delete"
	onconfirm={confirmDeleteTrip}
	oncancel={() => (deleteTripDialogOpen = false)}
/>

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
					<p class="text-lg text-gray-600 dark:text-gray-300 mb-2 flex items-center gap-1"><MapPin size={18} /> {tripDestinationLabel}</p>
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
							onclick={() => (deleteTripDialogOpen = true)}
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
				<form onsubmit={updateTrip} novalidate>
					<div class="mb-4">
						<label for="edit-title" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Trip Title <span class="text-red-500">*</span></label>
						<input
							type="text"
							id="edit-title"
							bind:value={editTitle}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
						/>
					</div>

					<div class="mb-4">
						<div class="flex items-center justify-between mb-2">
							<label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Destinations <span class="text-red-500">*</span></label>
							{#if editLegs.length > 1}
								<span class="text-xs text-gray-400 dark:text-gray-500">{editLegs.length} destinations</span>
							{/if}
						</div>
						<div class="space-y-2">
							{#each editLegs as leg, i}
								<div class="flex gap-2 items-start bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
									{#if editLegs.length > 1}
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
												class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
											/>
										</div>
										<div>
											<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">To</p>
											<input
												type="date"
												bind:value={leg.endDate}
												min={leg.startDate || ''}
												class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 text-sm"
											/>
										</div>
									</div>
									{#if editLegs.length > 1}
										<button type="button" onclick={() => removeEditLeg(i)} class="text-gray-400 hover:text-red-500 mt-2 shrink-0 transition">
											<X size={16} />
										</button>
									{/if}
								</div>
							{/each}
							<button
								type="button"
								onclick={addEditLeg}
								class="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-1 py-1 transition"
							>
								<Plus size={15} /> Add destination
							</button>
						</div>
					</div>

					<div class="mb-4">
						<label for="edit-desc" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description <span class="text-gray-400 font-normal">(optional)</span></label>
						<textarea
							id="edit-desc"
							bind:value={editDescription}
							rows="3"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
						></textarea>
					</div>
					<div class="mb-4">
						<label for="edit-cover" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Cover Image <span class="text-gray-400 font-normal">(optional)</span></label>
						{#if editCoverImage}
							<div class="relative mb-2">
								<img src={editCoverImage} alt="Current cover" class="h-28 w-full object-cover rounded-lg" />
								<button
									type="button"
									onclick={() => (editCoverImage = '')}
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
							onclick={() => { showEditForm = false; error = ''; }}
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
				<ExpenseList {tripId} {currentUserId} currency={trip.currency || 'CHF'} oncurrencychange={updateCurrency} startDate={trip.startDate} endDate={trip.endDate} />
			{:else if activeTab === 'gallery'}
				<Gallery {tripId} {currentUserId} />
			{:else if activeTab === 'checklist'}
				<TripChecklist {tripId} />
			{:else if activeTab === 'members'}
				<MemberList {tripId} {isOwner} {currentUserId} />
			{:else if activeTab === 'weather'}
				<TripWeather legs={trip.legs ?? []} />
			{:else if activeTab === 'map'}
				<TripMap {tripId} centerLat={trip.latitude} centerLon={trip.longitude} legs={trip.legs ?? []} />
			{/if}
		</div>
	{/if}
</main>

{#if trip}
	<TripChat {tripId} {currentUserId} {currentUserName} />
{/if}

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
