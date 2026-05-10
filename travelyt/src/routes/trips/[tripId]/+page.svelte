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

	let tripId = $state('');
	let trip = $state(null);
	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('activities');
	let currentUserId = $state('');
	let isOwner = $derived(trip !== null && trip.createdBy === currentUserId);

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
					<p class="text-lg text-gray-600 mb-2">📍 {trip.destination}</p>
					<p class="text-gray-600">
						📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)} ({daysBetween(
							trip.startDate,
							trip.endDate
						)} days)
					</p>
				</div>
				<button
					onclick={deleteTrip}
					class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg"
				>
					Delete Trip
				</button>
			</div>

			{#if trip.description}
				<p class="text-gray-700 bg-gray-50 p-4 rounded-lg">{trip.description}</p>
			{/if}
		</div>

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
							🎯 Activities
						{:else if tab === 'packing'}
							🎒 Packing
						{:else if tab === 'expenses'}
							💰 Budget
						{:else}
							👥 Members
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<!-- Tab Content -->
		<div class="bg-white rounded-lg shadow-md p-6">
			{#if activeTab === 'activities'}
				<ActivityList {tripId} />
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
