<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import DestinationInput from '$lib/components/DestinationInput.svelte';
	import { onMount } from 'svelte';
	import { ChevronLeft, ChevronRight, MapPin, Plus, X } from 'lucide-svelte';

	let trips = $state([]);
	let loading = $state(true);
	let viewYear = $state(new Date().getFullYear());
	let viewMonth = $state(new Date().getMonth()); // 0-indexed

	// --- New trip modal ---
	let showModal = $state(false);
	let formError = $state('');
	let formLoading = $state(false);
	let newTrip = $state({ title: '', description: '' });
	let newLeg = $state({ destination: '', startDate: '', endDate: '', latitude: null, longitude: null, resolvedLocation: '' });

	function toInputDate(d) {
		return d.toISOString().split('T')[0];
	}

	function openModal(day) {
		const dateStr = toInputDate(day);
		newTrip = { title: '', description: '' };
		newLeg = { destination: '', startDate: dateStr, endDate: dateStr, latitude: null, longitude: null, resolvedLocation: '' };
		formError = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	async function createTrip(event) {
		event.preventDefault();
		if (!newTrip.title.trim()) { formError = 'Please enter a trip title.'; return; }
		if (!newLeg.destination.trim()) { formError = 'Please enter a destination.'; return; }
		if (!newLeg.startDate) { formError = 'Please select a start date.'; return; }
		if (!newLeg.endDate) { formError = 'Please select an end date.'; return; }
		if (newLeg.endDate < newLeg.startDate) {
			formError = 'End date cannot be before start date.';
			return;
		}
		formLoading = true;
		formError = '';
		try {
			const res = await fetch('/api/trips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...newTrip, legs: [newLeg] })
			});
			const data = await res.json();
			if (data.success) {
				closeModal();
				await refreshTrips();
			} else {
				formError = data.error || 'Failed to create trip.';
			}
		} catch {
			formError = 'Network error.';
		} finally {
			formLoading = false;
		}
	}

	async function refreshTrips() {
		const res = await fetch('/api/trips');
		const data = await res.json();
		if (data.success) trips = data.trips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
	}

	// --- Calendar logic ---

	const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const PALETTE = [
		'bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
		'bg-indigo-500', 'bg-rose-500', 'bg-cyan-600', 'bg-green-600', 'bg-amber-500'
	];

	const PALETTE_LIGHT = [
		'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
		'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
		'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
		'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
		'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
		'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
		'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
		'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
		'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
	];

	let colorMap = $derived(
		Object.fromEntries(
			trips.map((t, i) => [
				t.id,
				{ bar: PALETTE[i % PALETTE.length], chip: PALETTE_LIGHT[i % PALETTE_LIGHT.length] }
			])
		)
	);

	let weeks = $derived.by(() => {
		const firstDay = new Date(viewYear, viewMonth, 1);
		const lastDay = new Date(viewYear, viewMonth + 1, 0);
		const startDate = new Date(firstDay);
		const dow = (firstDay.getDay() + 6) % 7;
		startDate.setDate(firstDay.getDate() - dow);
		const result = [];
		const cur = new Date(startDate);
		while (true) {
			const week = [];
			for (let i = 0; i < 7; i++) {
				week.push(new Date(cur));
				cur.setDate(cur.getDate() + 1);
			}
			result.push(week);
			if (cur > lastDay && result.length >= 4) break;
		}
		return result;
	});

	function parseDay(d) {
		const dt = new Date(d);
		dt.setHours(0, 0, 0, 0);
		return dt;
	}

	function diffDays(a, b) {
		return Math.round((b.getTime() - a.getTime()) / 86400000);
	}

	function eventsForWeek(weekDays) {
		const wStart = parseDay(weekDays[0]);
		const wEnd = parseDay(weekDays[6]);
		return trips
			.filter((trip) => {
				const s = parseDay(trip.startDate);
				const e = parseDay(trip.endDate);
				return s <= wEnd && e >= wStart;
			})
			.map((trip) => {
				const s = parseDay(trip.startDate);
				const e = parseDay(trip.endDate);
				return {
					...trip,
					startCol: Math.max(0, diffDays(wStart, s)),
					endCol: Math.min(6, diffDays(wStart, e)),
					startsThisWeek: s >= wStart,
					endsThisWeek: e <= wEnd
				};
			});
	}

	function prevMonth() {
		if (viewMonth === 0) { viewMonth = 11; viewYear--; } else viewMonth--;
	}
	function nextMonth() {
		if (viewMonth === 11) { viewMonth = 0; viewYear++; } else viewMonth++;
	}
	function goToday() {
		const now = new Date();
		viewYear = now.getFullYear();
		viewMonth = now.getMonth();
	}

	onMount(async () => {
		await refreshTrips();
		loading = false;
	});
</script>

<Header />

<!-- New Trip Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="presentation"
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/40 backdrop-blur-sm"
			role="presentation"
			onclick={closeModal}
		></div>

		<!-- Modal panel -->
		<div class="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
				<div>
					<h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">New Trip</h2>
					<p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
						Starting
						{new Date(newLeg.startDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
					</p>
				</div>
				<button
					onclick={closeModal}
					class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
				>
					<X size={18} />
				</button>
			</div>

			<!-- Form -->
			<form onsubmit={createTrip} novalidate class="p-6 flex flex-col gap-4">
				{#if formError}
					<p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{formError}</p>
				{/if}

				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="cal-title">
						Trip Title <span class="text-red-400">*</span>
					</label>
					<input
						id="cal-title"
						type="text"
						bind:value={newTrip.title}
						placeholder="e.g. Summer in Japan"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="cal-dest">
						Destination <span class="text-red-400">*</span>
					</label>
					<DestinationInput
						bind:value={newLeg.destination}
						onlocationselect={(loc) => {
							if (loc) { newLeg.latitude = loc.latitude; newLeg.longitude = loc.longitude; newLeg.resolvedLocation = loc.resolvedLocation; }
							else { newLeg.latitude = null; newLeg.longitude = null; newLeg.resolvedLocation = ''; }
						}}
						inputClass="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="cal-start">
							Start Date <span class="text-red-400">*</span>
						</label>
						<input
							id="cal-start"
							type="date"
							bind:value={newLeg.startDate}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="cal-end">
							End Date <span class="text-red-400">*</span>
						</label>
						<input
							id="cal-end"
							type="date"
							bind:value={newLeg.endDate}
							min={newLeg.startDate}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" for="cal-desc">
						Description <span class="text-gray-400 font-normal">(optional)</span>
					</label>
					<textarea
						id="cal-desc"
						bind:value={newTrip.description}
						placeholder="Add a note about this trip…"
						rows="2"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 resize-none"
					></textarea>
				</div>

				<div class="flex gap-2 pt-1">
					<button
						type="submit"
						disabled={formLoading}
						class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold py-2.5 rounded-xl transition text-sm"
					>
						{formLoading ? 'Creating…' : 'Create Trip'}
					</button>
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm font-medium"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<main class="max-w-6xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
	<!-- Page title + navigation -->
	<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
		<h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Calendar</h1>
		<div class="flex items-center gap-1.5">
			<button
				onclick={prevMonth}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
				aria-label="Previous month"
			>
				<ChevronLeft size={20} />
			</button>
			<span class="font-semibold text-gray-800 dark:text-gray-100 min-w-[170px] text-center text-base select-none">
				{MONTHS[viewMonth]} {viewYear}
			</span>
			<button
				onclick={nextMonth}
				class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-300"
				aria-label="Next month"
			>
				<ChevronRight size={20} />
			</button>
			<button
				onclick={goToday}
				class="ml-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
			>
				Today
			</button>
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center py-20">
			<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
		</div>
	{:else}
		<!-- Legend + add button -->
		<div class="flex flex-wrap items-center gap-2 mb-4">
			{#each trips as trip (trip.id)}
				{@const c = colorMap[trip.id]}
				<button
					onclick={() => goto(`/trips/${trip.id}`)}
					class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-80 {c.chip}"
				>
					<MapPin size={11} />{trip.title}
				</button>
			{/each}
		</div>

		<!-- Calendar grid -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
			<!-- Day-of-week header -->
			<div class="grid grid-cols-7 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
				{#each DAYS as day, i}
					<div class="py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none {i > 0 ? 'border-l border-gray-200 dark:border-gray-700' : ''}">
						{day}
					</div>
				{/each}
			</div>

			<!-- Week rows -->
			{#each weeks as week, wi}
				{@const events = eventsForWeek(week)}
				<div class="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
					<!-- Day number cells -->
					<div class="grid grid-cols-7">
						{#each week as day, di}
							{@const isToday = day.toDateString() === new Date().toDateString()}
							{@const inMonth = day.getMonth() === viewMonth}
							<button
								onclick={() => openModal(day)}
								class="group relative text-left px-2 pt-2 pb-1 min-h-[52px] transition-colors
									{di > 0 ? 'border-l border-gray-100 dark:border-gray-700' : ''}
									{!inMonth ? 'bg-gray-50/60 dark:bg-gray-800/60' : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'}"
								title="New trip starting {day.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}"
							>
								<span class="inline-flex items-center justify-center w-7 h-7 text-sm select-none {isToday
									? 'bg-blue-600 text-white rounded-full font-bold'
									: inMonth
										? 'text-gray-700 dark:text-gray-200 font-medium'
										: 'text-gray-300 dark:text-gray-600'}">
									{day.getDate()}
								</span>
								<!-- Plus icon shown on hover -->
								{#if inMonth}
									<span class="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400 dark:text-blue-500">
										<Plus size={13} />
									</span>
								{/if}
							</button>
						{/each}
					</div>

					<!-- Trip bars -->
					{#if events.length > 0}
						<div class="grid grid-cols-7 gap-y-0.5 px-0.5 pb-2 pt-0.5" style="grid-auto-flow: dense">
							{#each events as ev (ev.id + '-' + wi)}
								{@const c = colorMap[ev.id]}
								<button
									onclick={() => goto(`/trips/${ev.id}`)}
									title="{ev.title} · {ev.destination}"
									class="h-5 min-w-0 flex items-center text-[11px] font-semibold text-white truncate transition-opacity hover:opacity-75 focus:outline-none
										{c.bar}
										{ev.startsThisWeek ? 'rounded-l-full pl-2' : '-ml-0.5 pl-1'}
										{ev.endsThisWeek ? 'rounded-r-full pr-2' : '-mr-0.5 pr-1'}"
									style="grid-column: {ev.startCol + 1} / {ev.endCol + 2}"
								>
									{#if ev.startsThisWeek}{ev.title}{/if}
								</button>
							{/each}
						</div>
					{:else}
						<div class="h-2"></div>
					{/if}
				</div>
			{/each}
		</div>

		{#if trips.length === 0}
			<div class="mt-6 text-center py-10 text-gray-400 dark:text-gray-500">
				<p class="text-sm">Click any day to plan your first trip.</p>
			</div>
		{/if}
	{/if}
</main>
