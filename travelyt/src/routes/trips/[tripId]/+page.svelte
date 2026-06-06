<script>
	import { goto, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
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
	import { MapPin, Calendar, Target, Package, Wallet, Users, Images, ClipboardList, FileDown, Cloud, Map, Plus, X, ChevronDown, Pencil, Trash2 } from 'lucide-svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let tripId = $state('');
	let trip = $state(null);
	let loading = $state(true);
	let error = $state('');
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

	onMount(async () => {
		tripId = $page.params.tripId;
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		currentUserId = authData.userId || '';
		currentUserName = authData.user?.name || '';
		await fetchTrip();
		const tabParam = $page.url.searchParams.get('tab');
		const validTabs = ['activities', 'members', 'expenses', 'packing', 'checklist', 'weather', 'map', 'gallery'];
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
			const minYear = new Date().getFullYear() - 5;
			const maxYear = new Date().getFullYear() + 10;
			const startYear = new Date(leg.startDate).getFullYear();
			const endYear = new Date(leg.endDate).getFullYear();
			if (startYear < minYear || startYear > maxYear || endYear < minYear || endYear > maxYear) {
				error = `Destination ${i + 1}: year must be between ${minYear} and ${maxYear}`;
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
	let tripMenuOpen = $state(false);

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

{#if trip}
	<PageHeader title={trip.title} subtitle="{tripDestinationLabel} · {formatDate(trip.startDate)} – {formatDate(trip.endDate)}" description={trip.description} backHref="/trips" backLabel="My Trips">
		<div class="flex items-center gap-3">
			<div class="relative">
				<button
					onclick={() => (tripMenuOpen = !tripMenuOpen)}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-sm font-semibold transition border border-white/20"
				>
					Options <ChevronDown size={14} />
				</button>
				{#if tripMenuOpen}
					<div class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1 overflow-hidden">
						<a
							href="/trips/{tripId}/print"
							target="_blank"
							onclick={() => (tripMenuOpen = false)}
							class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
						>
							<FileDown size={15} class="text-gray-400" /> Export PDF
						</a>
						{#if isOwner}
							<button
								onclick={() => { tripMenuOpen = false; openEditForm(); }}
								class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
							>
								<Pencil size={15} class="text-gray-400" /> Edit Trip
							</button>
							<div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
							<button
								onclick={() => { tripMenuOpen = false; deleteTripDialogOpen = true; }}
								class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
							>
								<Trash2 size={15} /> Delete Trip
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</PageHeader>
{/if}

{#if tripMenuOpen}
	<div class="fixed inset-0 z-40" role="presentation" onclick={() => (tripMenuOpen = false)}></div>
{/if}

<main class="max-w-7xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
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
					<div class="flex gap-2">
						<button
							type="submit"
							disabled={editLoading}
							class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition"
						>
							{editLoading ? 'Saving...' : 'Save Changes'}
						</button>
						<button
							type="button"
							onclick={() => { showEditForm = false; error = ''; }}
							class="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 py-1.5 px-4 rounded-lg transition"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="mb-6">
			<div class="flex flex-wrap gap-1.5">
				{#each ['activities', 'members', 'expenses', 'packing', 'checklist', 'weather', 'map', 'gallery'] as tab}
					<button
						onclick={() => { activeTab = tab; replaceState(`?tab=${tab}`, {}); }}
						class="flex items-center gap-1.5 py-2 px-4 rounded-xl text-sm font-semibold transition {activeTab === tab
							? 'bg-blue-600 text-white shadow-sm'
							: 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'}"
					>
						{#if tab === 'activities'}
							<Target size={14} /> Activities
						{:else if tab === 'packing'}
							<Package size={14} /> Packing
						{:else if tab === 'expenses'}
							<Wallet size={14} /> Budget
						{:else if tab === 'gallery'}
							<Images size={14} /> Gallery
						{:else if tab === 'checklist'}
							<ClipboardList size={14} /> Checklist
						{:else if tab === 'weather'}
							<Cloud size={14} /> Weather
						{:else if tab === 'map'}
							<Map size={14} /> Map
						{:else}
							<Users size={14} /> Members
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
