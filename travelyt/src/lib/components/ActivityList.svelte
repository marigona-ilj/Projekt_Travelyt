<script>
	import { onMount } from 'svelte';
	import { Clock, MapPin } from 'lucide-svelte';

	let { tripId, startDate, endDate } = $props();

	let activities = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewActivityForm = $state(false);
	let newActivity = $state({ title: '', description: '', date: '', time: '', location: '' });
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
				newActivity = { title: '', description: '', date: '', time: '', location: '' };
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

	// All trip days as YYYY-MM-DD strings
	let allDays = $derived.by(() => {
		if (!startDate || !endDate) return [];
		const days = [];
		const start = new Date(startDate);
		const end = new Date(endDate);
		start.setHours(0, 0, 0, 0);
		end.setHours(0, 0, 0, 0);
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			days.push(d.toISOString().split('T')[0]);
		}
		return days;
	});

	// Activities grouped by date, sorted by time within each day
	let grouped = $derived.by(() => {
		const map = {};
		for (const activity of activities) {
			const key = activity.date;
			if (!map[key]) map[key] = [];
			map[key].push(activity);
		}
		for (const key of Object.keys(map)) {
			map[key].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
		}
		return map;
	});

	function formatDayHeader(dateStr) {
		// Parse as local date to avoid timezone shift
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}
</script>

<div>
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold text-gray-800">Itinerary</h2>
		<button
			onclick={() => (showNewActivityForm = !showNewActivityForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Activity
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	{#if showNewActivityForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
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
						min={allDays[0]}
						max={allDays[allDays.length - 1]}
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
					placeholder="Location (optional)"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
				/>
				<textarea
					bind:value={newActivity.description}
					placeholder="Notes (optional)"
					rows="2"
					class="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3"
				></textarea>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1 px-3 rounded text-sm"
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
		<p class="text-gray-600">Loading itinerary...</p>
	{:else if allDays.length === 0}
		<!-- Fallback: no trip dates available, show flat list -->
		{#if activities.length === 0}
			<p class="text-gray-500">No activities yet. Add one to get started!</p>
		{:else}
			<div class="space-y-2">
				{#each activities as activity}
					<div class="bg-gray-50 rounded p-3 flex justify-between items-start">
						<div>
							<p class="font-semibold text-gray-800">{activity.title}</p>
							{#if activity.time}<p class="text-sm text-gray-500 flex items-center gap-1"><Clock size={13} /> {activity.time}</p>{/if}
							{#if activity.location}<p class="text-sm text-gray-500 flex items-center gap-1"><MapPin size={13} /> {activity.location}</p>{/if}
							{#if activity.description}<p class="text-sm text-gray-600 mt-1">{activity.description}</p>{/if}
						</div>
						<button onclick={() => deleteActivity(activity.id)} class="text-red-400 hover:text-red-600 text-sm">✕</button>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- Day-by-day itinerary -->
		<div class="space-y-6">
			{#each allDays as day, i}
				<div>
					<!-- Day header -->
					<div class="flex items-center gap-3 mb-3">
						<div class="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
							{i + 1}
						</div>
						<div>
							<p class="font-bold text-gray-800">{formatDayHeader(day)}</p>
							<p class="text-xs text-gray-400">Day {i + 1}</p>
						</div>
					</div>

					<!-- Activities for this day -->
					{#if grouped[day] && grouped[day].length > 0}
						<div class="ml-5 pl-8 border-l-2 border-blue-100 space-y-3">
							{#each grouped[day] as activity}
								<div class="relative bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
									<div class="absolute -left-[2.15rem] top-4 w-3 h-3 rounded-full bg-blue-400 border-2 border-white"></div>
									<div class="flex justify-between items-start">
										<div class="flex-1">
											<p class="font-semibold text-gray-800">{activity.title}</p>
											{#if activity.time}
												<p class="text-sm text-blue-600 font-medium mt-0.5 flex items-center gap-1"><Clock size={13} /> {activity.time}</p>
											{/if}
											{#if activity.location}
												<p class="text-sm text-gray-500 mt-0.5 flex items-center gap-1"><MapPin size={13} /> {activity.location}</p>
											{/if}
											{#if activity.description}
												<p class="text-sm text-gray-600 mt-1">{activity.description}</p>
											{/if}
										</div>
										<button onclick={() => deleteActivity(activity.id)} class="text-red-400 hover:text-red-600 text-sm ml-2">✕</button>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="ml-5 pl-8 border-l-2 border-gray-100">
							<p class="text-gray-400 text-sm italic py-1">Nothing planned yet.</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
