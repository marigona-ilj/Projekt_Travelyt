<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import ActivityList from '$lib/components/ActivityList.svelte';
	import ExpenseList from '$lib/components/ExpenseList.svelte';
	import PackingList from '$lib/components/PackingList.svelte';
	import MemberList from '$lib/components/MemberList.svelte';
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';
	import { MapPin, Calendar, Target, Package, Wallet, Users } from 'lucide-svelte';

	const currencies = ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];

	let tripId = $state('');
	let trip = $state(null);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('activities');
	let currentUserId = $state('');
	let isOwner = $derived(trip !== null && trip.createdBy === currentUserId);

	let showEditForm = $state(false);
	let editTrip = $state({ title: '', destination: '', startDate: '', endDate: '', description: '', currency: 'CHF' });
	let editLoading = $state(false);

	onMount(async () => {
		tripId = $page.params.tripId;
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		currentUserId = authData.userId || '';
		await fetchTrip();
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
			currency: trip.currency || 'CHF'
		};
		showEditForm = true;
	}

	async function updateTrip(event) {
		if (event?.preventDefault) event.preventDefault();
		editLoading = true;
		error = '';
		try {
			const response = await fetch(`/api/trips/${tripId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editTrip)
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

<main class="max-w-6xl mx-auto px-4 py-8">
	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="text-center py-12">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading trip...</p>
		</div>
	{:else if trip}
		<div class="mb-8">
			<div class="flex justify-between items-start mb-4">
				<div>
					<h1 class="text-4xl font-bold text-gray-800 mb-2">{trip.title}</h1>
					<p class="text-lg text-gray-600 mb-2 flex items-center gap-1"><MapPin size={18} /> {trip.destination}</p>
					<p class="text-gray-600 flex items-center gap-1">
						<Calendar size={16} /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)} ({daysBetween(
							trip.startDate,
							trip.endDate
						)} days)
					</p>
				</div>
			<div class="flex gap-2">
					{#if isOwner}
						<button
							onclick={openEditForm}
							class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
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
				<p class="text-gray-700 bg-gray-50 p-4 rounded-lg">{trip.description}</p>
			{/if}
		</div>

		<!-- Edit form -->
		{#if showEditForm}
			<div class="bg-white rounded-lg shadow-md p-6 mb-8 border border-blue-200">
				<h2 class="text-xl font-bold mb-4 text-gray-800">Edit Trip</h2>
				<form onsubmit={updateTrip}>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label for="edit-title" class="block text-sm font-medium text-gray-700 mb-1">Trip Title</label>
							<input
								type="text"
								id="edit-title"
								bind:value={editTrip.title}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>
						<div>
							<label for="edit-dest" class="block text-sm font-medium text-gray-700 mb-1">Destination</label>
							<input
								type="text"
								id="edit-dest"
								bind:value={editTrip.destination}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label for="edit-start" class="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
							<input
								type="date"
								id="edit-start"
								bind:value={editTrip.startDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>
						<div>
							<label for="edit-end" class="block text-sm font-medium text-gray-700 mb-1">End Date</label>
							<input
								type="date"
								id="edit-end"
								bind:value={editTrip.endDate}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
								required
							/>
						</div>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						<div>
							<label for="edit-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
							<textarea
								id="edit-desc"
								bind:value={editTrip.description}
								rows="3"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							></textarea>
						</div>
						<div>
							<label for="edit-currency" class="block text-sm font-medium text-gray-700 mb-1">Currency</label>
							<select
								id="edit-currency"
								bind:value={editTrip.currency}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
							>
								{#each currencies as c}
									<option value={c}>{c}</option>
								{/each}
							</select>
						</div>
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
							class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Tabs -->
		<div class="mb-6">
			<div class="flex border-b border-gray-300">
				{#each ['activities', 'packing', 'expenses', 'members'] as tab}
					<button
						onclick={() => (activeTab = tab)}
						class="py-2 px-4 font-semibold {activeTab === tab
							? 'text-blue-600 border-b-2 border-blue-600'
							: 'text-gray-600 hover:text-gray-800'}"
					>
						{#if tab === 'activities'}
							<span class="flex items-center gap-1"><Target size={15} /> Activities</span>
						{:else if tab === 'packing'}
							<span class="flex items-center gap-1"><Package size={15} /> Packing</span>
						{:else if tab === 'expenses'}
							<span class="flex items-center gap-1"><Wallet size={15} /> Budget</span>
						{:else}
							<span class="flex items-center gap-1"><Users size={15} /> Members</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Tab Content -->
		<div class="bg-white rounded-lg shadow-md p-6">
			{#if activeTab === 'activities'}
				<ActivityList {tripId} startDate={trip.startDate} endDate={trip.endDate} />
			{:else if activeTab === 'packing'}
				<PackingList {tripId} {currentUserId} />
			{:else if activeTab === 'expenses'}
				<ExpenseList {tripId} {currentUserId} currency={trip.currency || 'CHF'} />
			{:else if activeTab === 'members'}
				<MemberList {tripId} {isOwner} />
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
