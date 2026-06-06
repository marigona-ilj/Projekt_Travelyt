<script>
	import { onMount } from 'svelte';
	import { Clock, MapPin, Pencil, Trash2 } from 'lucide-svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { tripId, startDate, endDate } = $props();

	let activities = $state([]);
	let loading = $state(true);
	let error = $state('');
	let newActivity = $state({ title: '', description: '', date: '', time: '', location: '' });
	let formLoading = $state(false);
	let activeDay = $state(null);
	let editingId = $state(null);
	let editingActivity = $state({ title: '', description: '', date: '', time: '', location: '' });
	let editLoading = $state(false);
	let draggingId = $state(null);
	let dragOverDay = $state(null);

	let toastKey = $state(0);
	let toastVisible = $state(false);
	let toastMessage = $state('');
	let pendingDelete = $state(null);
	let deleteTimer = null;
	const UNDO_DURATION = 5000;

	function flushPendingDelete() {
		if (!pendingDelete) return;
		clearTimeout(deleteTimer);
		const id = pendingDelete.id;
		pendingDelete = null;
		fetch(`/api/trips/${tripId}/activities/${id}`, { method: 'DELETE' });
	}

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
		if (!newActivity.title) {
			error = 'Activity title is required';
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
				activeDay = null;
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

	function deleteActivity(id) {
		flushPendingDelete();
		const index = activities.findIndex((a) => a.id === id);
		if (index === -1) return;
		const data = activities[index];
		pendingDelete = { id, data, index };
		activities = activities.filter((a) => a.id !== id);
		toastMessage = `"${data.title}" deleted`;
		toastVisible = true;
		toastKey++;
		deleteTimer = setTimeout(() => {
			toastVisible = false;
			fetch(`/api/trips/${tripId}/activities/${id}`, { method: 'DELETE' });
			pendingDelete = null;
		}, UNDO_DURATION);
	}

	function undoDeleteActivity() {
		if (!pendingDelete) return;
		clearTimeout(deleteTimer);
		const restored = [...activities];
		restored.splice(pendingDelete.index, 0, pendingDelete.data);
		activities = restored;
		pendingDelete = null;
		toastVisible = false;
	}

	let allDays = $derived.by(() => {
		if (!startDate || !endDate) return [];
		const days = [];
		const [sy, sm, sd] = String(startDate).split('T')[0].split('-').map(Number);
		const [ey, em, ed] = String(endDate).split('T')[0].split('-').map(Number);
		const start = new Date(sy, sm - 1, sd);
		const end = new Date(ey, em - 1, ed);
		for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, '0');
			const dd = String(d.getDate()).padStart(2, '0');
			days.push(`${yyyy}-${mm}-${dd}`);
		}
		return days;
	});

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

	function handleDragStart(event, activity) {
		draggingId = activity.id;
		event.dataTransfer.effectAllowed = 'move';
	}

	function handleDragEnd() {
		draggingId = null;
		dragOverDay = null;
	}

	function handleDragOver(event, day) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		dragOverDay = day;
	}

	function handleDragLeave(event) {
		if (!event.currentTarget.contains(event.relatedTarget)) {
			dragOverDay = null;
		}
	}

	async function handleDrop(event, day) {
		event.preventDefault();
		dragOverDay = null;
		if (!draggingId) return;

		const activity = activities.find((a) => a.id === draggingId);
		draggingId = null;
		if (!activity) return;

		const activityDay = activity.date?.split('T')[0] ?? activity.date;
		if (activityDay === day) return;

		try {
			const response = await fetch(`/api/trips/${tripId}/activities/${activity.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: activity.title,
					description: activity.description || '',
					date: day,
					time: activity.time || '',
					location: activity.location || ''
				})
			});
			const data = await response.json();
			if (data.success) {
				await fetchActivities();
			} else {
				error = data.error || 'Failed to move activity';
			}
		} catch (err) {
			error = 'Network error';
		}
	}

	function startEdit(activity) {
		editingId = activity.id;
		editingActivity = {
			title: activity.title,
			description: activity.description || '',
			date: activity.date,
			time: activity.time || '',
			location: activity.location || ''
		};
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!editingActivity.title) return;
		editLoading = true;
		try {
			const response = await fetch(`/api/trips/${tripId}/activities/${editingId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editingActivity)
			});
			const data = await response.json();
			if (data.success) {
				editingId = null;
				await fetchActivities();
			} else {
				error = data.error || 'Failed to update';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			editLoading = false;
		}
	}

	function openDayForm(day) {
		activeDay = day;
		newActivity = { title: '', description: '', date: day, time: '', location: '' };
	}

	function cancelDayForm() {
		activeDay = null;
		newActivity = { title: '', description: '', date: '', time: '', location: '' };
		error = '';
	}

	function formatDayHeader(dateStr) {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDayShort(dateStr) {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

{#key toastKey}
	<Toast message={toastMessage} visible={toastVisible} onUndo={undoDeleteActivity} duration={UNDO_DURATION} />
{/key}

<div>
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Itinerary</h2>
		{#if allDays.length > 0}
			<p class="text-sm text-gray-400 dark:text-gray-500">{allDays.length} {allDays.length === 1 ? 'day' : 'days'}</p>
		{/if}
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl mb-4 text-sm">{error}</div>
	{/if}

	{#if loading}
		<p class="text-gray-500 dark:text-gray-400 text-sm">Loading itinerary...</p>
	{:else if allDays.length === 0}
		{#if activities.length === 0}
			<div class="text-center py-12 text-gray-400 dark:text-gray-500">
				<p class="text-sm">No activities yet. Add one to get started.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each activities as activity}
					<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex justify-between items-start">
						<div>
							<p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">{activity.title}</p>
							{#if activity.time}<p class="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1"><Clock size={11} /> {activity.time}</p>{/if}
							{#if activity.location}<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1"><MapPin size={11} /> {activity.location}</p>{/if}
							{#if activity.description}<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{activity.description}</p>{/if}
						</div>
						<button onclick={() => deleteActivity(activity.id)} class="text-gray-400 hover:text-red-500 p-1 rounded transition"><Trash2 size={14} /></button>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			{#each allDays as day, i}
				<div
					ondragover={(e) => handleDragOver(e, day)}
					ondragleave={handleDragLeave}
					ondrop={(e) => handleDrop(e, day)}
					class="rounded-2xl overflow-hidden border transition-all {dragOverDay === day ? 'border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-gray-200 dark:border-gray-700'}"
				>
					<!-- Card header -->
					<div class="flex items-center gap-3 px-4 py-3 bg-blue-700 dark:bg-blue-800">
						<span class="flex-shrink-0 bg-blue-500 text-white text-xs font-bold px-2.5 py-1 rounded-md tracking-wide">DAY {i + 1}</span>
						<span class="flex-1 text-white text-sm font-semibold truncate">{formatDayHeader(day)}</span>
						<button
							onclick={() => activeDay === day ? cancelDayForm() : openDayForm(day)}
							class="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg transition {activeDay === day ? 'bg-white/10 text-white' : 'bg-white/15 text-white hover:bg-white/30'}"
						>
							{activeDay === day ? 'Cancel' : '+ Add'}
						</button>
					</div>

					<!-- Card body -->
					<div class="bg-white dark:bg-gray-800 px-4 py-3 min-h-[80px]">
						{#if grouped[day] && grouped[day].length > 0}
							<div class="space-y-0.5">
								{#each grouped[day] as activity}
									<div
										draggable="true"
										ondragstart={(e) => handleDragStart(e, activity)}
										ondragend={handleDragEnd}
										class="group rounded-lg transition cursor-grab active:cursor-grabbing {draggingId === activity.id ? 'opacity-40' : ''} {editingId === activity.id ? 'bg-gray-50 dark:bg-gray-700/50 p-3 mb-2' : 'hover:bg-gray-50 dark:hover:bg-gray-700/40 px-2 py-1.5'}"
									>
										{#if editingId === activity.id}
											<form onsubmit={saveEdit} novalidate class="space-y-2">
												<input
													type="text"
													bind:value={editingActivity.title}
													placeholder="Activity title"
													class="w-full px-3 py-2 border border-blue-400 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
												/>
												<div class="grid grid-cols-3 gap-2">
													<input
														type="date"
														bind:value={editingActivity.date}
														min={allDays[0]}
														max={allDays[allDays.length - 1]}
														class="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
													<input
														type="time"
														bind:value={editingActivity.time}
														class="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
													<input
														type="text"
														bind:value={editingActivity.location}
														placeholder="Location"
														class="px-2 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
													/>
												</div>
												<textarea
													bind:value={editingActivity.description}
													placeholder="Notes (optional)"
													rows="2"
													class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
												></textarea>
												<div class="flex gap-2">
													<button type="submit" disabled={editLoading} class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition">
														{editLoading ? 'Saving...' : 'Save'}
													</button>
													<button type="button" onclick={cancelEdit} class="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 py-1.5 px-4 rounded-lg transition">
														Cancel
													</button>
												</div>
											</form>
										{:else}
											<div class="flex items-start gap-3">
												<span class="flex-shrink-0 w-10 text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">{activity.time || ''}</span>
												<div class="flex-1 min-w-0">
													<p class="text-sm text-gray-800 dark:text-gray-100 leading-snug">{activity.title}</p>
													{#if activity.location}
														<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1 truncate">
															<MapPin size={10} class="flex-shrink-0" />{activity.location}
														</p>
													{/if}
													{#if activity.description}
														<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{activity.description}</p>
													{/if}
												</div>
												<div class="flex-shrink-0 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
													<button onclick={() => startEdit(activity)} class="p-1 rounded text-gray-400 hover:text-blue-500 transition"><Pencil size={13} /></button>
													<button onclick={() => deleteActivity(activity.id)} class="p-1 rounded text-gray-400 hover:text-red-500 transition"><Trash2 size={13} /></button>
												</div>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{:else if activeDay !== day}
							<p class="text-sm italic text-gray-800 dark:text-gray-200 pt-1">Nothing planned yet.</p>
						{/if}

						<!-- Inline add form -->
						{#if activeDay === day}
							<div class="mt-2 pt-2 {grouped[day]?.length > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}">
								<form onsubmit={createActivity} novalidate class="space-y-2">
									<input
										type="text"
										bind:value={newActivity.title}
										placeholder="Activity title"
										class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
										autofocus
									/>
									<div class="grid grid-cols-2 gap-2">
										<input
											type="time"
											bind:value={newActivity.time}
											class="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
										<input
											type="text"
											bind:value={newActivity.location}
											placeholder="Location (optional)"
											class="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
										/>
									</div>
									<textarea
										bind:value={newActivity.description}
										placeholder="Notes (optional)"
										rows="2"
										class="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
									></textarea>
									<div class="flex gap-2">
										<button type="submit" disabled={formLoading} class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition">
											{formLoading ? 'Adding...' : 'Add activity'}
										</button>
										<button type="button" onclick={cancelDayForm} class="text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 py-1.5 px-4 rounded-lg transition">
											Cancel
										</button>
									</div>
								</form>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
