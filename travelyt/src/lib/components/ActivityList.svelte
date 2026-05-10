<script>
	import { formatDateTime, groupBy } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';

	let { tripId } = $props();

	let activities = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewActivityForm = $state(false);
	let newActivity = $state({
		title: '',
		description: '',
		date: '',
		time: '',
		location: '',
		category: 'other'
	});
	let formLoading = $state(false);

	onMount(async () => {
		await fetchActivities();
	});

	async function fetchActivities() {
		try {
			const response = await fetch(`/api/trips/${tripId}/activities`);
			const data = await response.json();
			if (data.success) {
				activities = data.activities;
			} else {
				error = data.error || 'Failed to load activities';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	async function createActivity(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!newActivity.title || !newActivity.date) {
			error = 'Please fill in title and date';
			return;
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch(`/api/trips/${tripId}/activities`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newActivity)
			});

			const data = await response.json();

			if (data.success) {
				newActivity = {
					title: '',
					description: '',
					date: '',
					time: '',
					location: '',
					category: 'other'
				};
				showNewActivityForm = false;
				await fetchActivities();
			} else {
				error = data.error || 'Failed to create activity';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			formLoading = false;
		}
	}

	async function deleteActivity(id) {
		if (confirm('Delete this activity?')) {
			try {
				const response = await fetch(`/api/trips/${tripId}/activities/${id}`, {
					method: 'DELETE'
				});

				const data = await response.json();
				if (data.success) {
					await fetchActivities();
				} else {
					error = data.error || 'Failed to delete';
				}
			} catch (err) {
				error = 'Network error';
			}
		}
	}

	let grouped = $derived(groupBy(activities, 'date'));
</script>

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800">Activities</h2>
		<button
			onclick={() => (showNewActivityForm = !showNewActivityForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Activity
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if showNewActivityForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-4">
			<form onsubmit={createActivity}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newActivity.title}
						placeholder="Activity title"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 mb-3">
					<input
						type="date"
						bind:value={newActivity.date}
						class="px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
					<input
						type="time"
						bind:value={newActivity.time}
						class="px-3 py-2 border border-gray-300 rounded text-sm"
					/>
				</div>
				<input
					type="text"
					bind:value={newActivity.location}
					placeholder="Location"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
				/>
				<textarea
					bind:value={newActivity.description}
					placeholder="Description"
					rows="2"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
				></textarea>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
					>
						{formLoading ? 'Adding...' : 'Add'}
					</button>
					<button
						type="button"
						onclick={() => (showNewActivityForm = false)}
						class="bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600">Loading activities...</p>
	{:else if activities.length === 0}
		<p class="text-gray-600">No activities yet. Add one to get started!</p>
	{:else}
		<div class="space-y-4">
			{#each Object.entries(grouped) as [date, dateActivities]}
				<div>
					<h3 class="font-semibold text-gray-700 mb-2">
						{new Date(date).toLocaleDateString('en-US', {
							weekday: 'long',
							month: 'short',
							day: 'numeric'
						})}
					</h3>
					<div class="space-y-2">
						{#each dateActivities as activity}
							<div class="bg-gray-50 rounded p-3 flex justify-between items-start">
								<div>
									<p class="font-semibold text-gray-800">{activity.title}</p>
									{#if activity.time}
										<p class="text-sm text-gray-600">🕐 {activity.time}</p>
									{/if}
									{#if activity.location}
										<p class="text-sm text-gray-600">📍 {activity.location}</p>
									{/if}
									{#if activity.description}
										<p class="text-sm text-gray-600 mt-1">{activity.description}</p>
									{/if}
								</div>
								<button
									onclick={() => deleteActivity(activity.id)}
									class="text-red-600 hover:text-red-800 text-sm"
								>
									✕
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
