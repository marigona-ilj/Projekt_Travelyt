<script>
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';
	import { onMount } from 'svelte';
	import { Plane, TrendingDown, TrendingUp, CheckCircle, ArrowRight, MapPin, Calendar, Wallet, Globe, ChevronLeft, ChevronRight } from 'lucide-svelte';

	let userName = $state('');
	let upcomingTrips = $state([]);
	let carouselIndex = $state(0);
	let balances = $state([]);
	let stats = $state(null);
	let feedEntries = $state([]);
	let feedLoading = $state(true);
	let dashLoading = $state(true);
	let feedError = $state('');

	let currentTrip = $derived(upcomingTrips[carouselIndex] ?? null);
	let currentMembers = $derived(currentTrip?.members ?? []);
	let slideDir = $state('right');

	function carouselPrev() {
		slideDir = 'left';
		carouselIndex = (carouselIndex - 1 + upcomingTrips.length) % upcomingTrips.length;
	}
	function carouselNext() {
		slideDir = 'right';
		carouselIndex = (carouselIndex + 1) % upcomingTrips.length;
	}
	function carouselGoto(i) {
		slideDir = i > carouselIndex ? 'right' : 'left';
		carouselIndex = i;
	}

	let greeting = $derived.by(() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 18) return 'Good afternoon';
		return 'Good evening';
	});

	let todayStr = $derived(
		new Date().toLocaleDateString('en-GB', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		})
	);

	let countdown = $derived.by(() => {
		if (!currentTrip) return null;
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const start = new Date(currentTrip.startDate);
		start.setHours(0, 0, 0, 0);
		const diff = Math.round((start - now) / 86400000);
		if (diff <= 0) return { days: null, label: 'Ongoing now', isNow: true };
		if (diff === 1) return { days: 1, label: 'Tomorrow', isNow: false };
		return { days: diff, label: `days to go`, isNow: false };
	});

	let totalOwed = $derived(
		balances.filter((b) => b.amount > 0).reduce((s, b) => s + b.amount, 0)
	);
	let totalOwe = $derived(
		Math.abs(balances.filter((b) => b.amount < 0).reduce((s, b) => s + b.amount, 0))
	);

	async function fetchFeed() {
		try {
			const res = await fetch('/api/feed');
			const data = await res.json();
			if (data.success) {
				feedEntries = data.entries;
				feedError = '';
			} else {
				feedError = data.error || 'Failed to load';
			}
		} catch {
			feedError = 'Network error';
		} finally {
			feedLoading = false;
		}
	}

	onMount(async () => {
		const [dashRes] = await Promise.all([fetch('/api/dashboard'), fetchFeed()]);
		const dash = await dashRes.json();
		if (dash.success) {
			userName = dash.userName;
			upcomingTrips = dash.upcomingTrips ?? [];
			balances = dash.balances;
			stats = dash.stats ?? null;
		}
		dashLoading = false;
	});
</script>

<Header />

<!-- Welcome Banner -->
<div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
	<div class="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
		<Plane
			size={240}
			class="absolute -right-6 top-1/2 -translate-y-1/2 text-white opacity-[0.07] rotate-12"
		/>
	</div>
	<div class="max-w-6xl mx-auto px-4 py-7 relative">
		<p class="text-blue-200 text-sm font-medium mb-1">{todayStr}</p>
		<h1 class="text-3xl font-bold text-white">
			{greeting}{userName ? `, ${userName}` : ''}!
		</h1>
		{#if !dashLoading}
			<div class="mt-4 flex flex-wrap gap-2">
				{#if currentTrip && countdown}
					<span class="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-white text-sm font-medium px-3.5 py-1.5 rounded-full">
						<Plane size={13} />
						{currentTrip.title}
						·
						{countdown.isNow ? countdown.label : countdown.days === 1 ? 'Tomorrow' : `In ${countdown.days} days`}
					</span>
				{/if}
				{#if totalOwed > 0.005}
					<span class="inline-flex items-center gap-1.5 bg-green-400/20 text-green-100 text-sm font-medium px-3.5 py-1.5 rounded-full">
						<TrendingUp size={13} />
						Owed CHF {totalOwed.toFixed(2)}
					</span>
				{/if}
				{#if totalOwe > 0.005}
					<span class="inline-flex items-center gap-1.5 bg-red-400/20 text-red-100 text-sm font-medium px-3.5 py-1.5 rounded-full">
						<TrendingDown size={13} />
						You owe CHF {totalOwe.toFixed(2)}
					</span>
				{/if}
			</div>
		{/if}
	</div>
</div>

<main class="bg-gray-50 dark:bg-gray-900 min-h-screen">
	<div class="max-w-6xl mx-auto px-4 py-6">
		{#if dashLoading}
			<div class="flex justify-center py-20">
				<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
			</div>
		{:else}
			{#if stats}
				<div class="grid grid-cols-3 gap-3 mb-5">
					{#each [
						{ icon: Plane, label: 'Trips completed', value: stats.completedTrips, planned: stats.upcomingTrips, plannedLabel: 'planned', bg: 'bg-blue-600', light: 'bg-blue-50 dark:bg-blue-950/60', border: 'border-blue-100 dark:border-blue-900', href: '/trips' },
						{ icon: Globe, label: 'Destinations visited', value: stats.destinations, planned: stats.plannedDestinations, plannedLabel: 'planned', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/60', border: 'border-emerald-100 dark:border-emerald-900', href: '/trips' },
						{ icon: Wallet, label: 'Total spent so far', value: stats.totalSpent.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), planned: null, plannedLabel: '', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/60', border: 'border-violet-100 dark:border-violet-900', href: null }
					] as s}
						<div
							class="rounded-2xl border {s.light} {s.border} px-4 py-4 flex items-center gap-3 {s.href ? 'cursor-pointer hover:brightness-95 transition-all' : ''}"
							onclick={() => s.href && goto(s.href)}
							role={s.href ? 'button' : undefined}
						>
							<div class="w-10 h-10 rounded-xl {s.bg} flex items-center justify-center shrink-0 shadow-sm">
								<svelte:component this={s.icon} size={17} class="text-white" />
							</div>
							<div class="min-w-0">
								<p class="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">{s.value}</p>
								<p class="text-xs text-gray-600 dark:text-gray-300 mt-0.5 font-semibold">{s.label}</p>
								{#if s.planned !== null}
									<span class="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{s.planned} {s.plannedLabel}</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
				<!-- Left column (2/3) -->
				<div class="lg:col-span-2 flex flex-col gap-5">

					<!-- Upcoming Trips Carousel -->
					{#if upcomingTrips.length > 0}
						<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden group">
							<!-- Image hero -->
							<div class="relative h-60 overflow-hidden">
								{#key carouselIndex}
									<div class="absolute inset-0 carousel-slide-{slideDir}">
										{#if currentTrip.coverImage}
											<img src={currentTrip.coverImage} alt={currentTrip.title} class="w-full h-full object-cover" />
										{:else}
											<div class="w-full h-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700"></div>
											<div class="absolute inset-0 flex items-center justify-center opacity-10">
												<Plane size={120} class="text-white rotate-12" />
											</div>
										{/if}
										<div class="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent"></div>
									</div>
								{/key}

								<!-- Countdown badge -->
								{#if countdown}
									{#if countdown.isNow}
										<div class="absolute top-4 right-4 bg-green-500 text-white rounded-xl px-3 py-1.5 shadow-lg z-10">
											<p class="text-sm font-bold">Ongoing</p>
										</div>
									{:else if countdown.days === 1}
										<div class="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-xl px-3 py-1.5 shadow-lg text-center z-10">
											<p class="text-sm font-black text-blue-600">Tomorrow</p>
										</div>
									{:else}
										<div class="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-xl px-3.5 py-2 shadow-lg text-center min-w-[64px] z-10">
											<p class="text-3xl font-black text-blue-600 leading-none">{countdown.days}</p>
											<p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">days to go</p>
										</div>
									{/if}
								{/if}

								<!-- Carousel arrows -->
								{#if upcomingTrips.length > 1}
									<button onclick={carouselPrev} class="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition z-10">
										<ChevronLeft size={18} />
									</button>
									<button onclick={carouselNext} class="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition z-10">
										<ChevronRight size={18} />
									</button>
								{/if}

								<!-- Trip info overlay -->
								<div class="absolute bottom-0 left-0 right-0 p-5 z-10">
									<p class="text-blue-300 text-[11px] font-semibold uppercase tracking-widest mb-1">
										{countdown?.isNow ? 'Ongoing' : 'Upcoming Trip'}{upcomingTrips.length > 1 ? ` · ${carouselIndex + 1} / ${upcomingTrips.length}` : ''}
									</p>
									<h2 class="text-2xl font-bold text-white leading-tight">{currentTrip.title}</h2>
									<p class="text-white/75 flex items-center gap-1 text-sm mt-0.5">
										<MapPin size={12} />
										{currentTrip.legs?.length > 1 ? currentTrip.legs.map((l) => l.destination).join(' → ') : currentTrip.destination}
									</p>
								</div>
							</div>

							<!-- Card footer -->
							<div class="px-5 py-4 flex items-center justify-between gap-4">
								<div class="flex flex-col gap-2 min-w-0">
									<div class="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
										<Calendar size={14} class="shrink-0" />
										<span>
											{new Date(currentTrip.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
											–
											{new Date(currentTrip.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
										</span>
									</div>
									{#if currentMembers.length > 0}
										<div class="flex items-center gap-2">
											<div class="flex -space-x-2">
												{#each currentMembers.slice(0, 5) as member (member.userId)}
													{@const initials = member.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
													{@const colors = ['bg-blue-500','bg-indigo-500','bg-violet-500','bg-pink-500','bg-teal-500']}
													{@const colorIdx = member.userId.charCodeAt(member.userId.length - 1) % colors.length}
													<div class="w-7 h-7 rounded-full {colors[colorIdx]} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800 shrink-0" title={member.name}>
														{initials}
													</div>
												{/each}
												{#if currentMembers.length > 5}
													<div class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800">
														+{currentMembers.length - 5}
													</div>
												{/if}
											</div>
											<span class="text-xs text-gray-400 dark:text-gray-500 truncate">
												{currentMembers.map((m) => m.name.split(' ')[0]).join(', ')}
											</span>
										</div>
									{/if}
								</div>
								<button
									onclick={() => goto(`/trips/${currentTrip.id}`)}
									class="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
								>
									View Trip <ArrowRight size={14} />
								</button>
							</div>

							<!-- Dot indicators -->
							{#if upcomingTrips.length > 1}
								<div class="flex justify-center gap-1.5 pb-3">
									{#each upcomingTrips as _, i}
										<button
											onclick={() => carouselGoto(i)}
											class="h-2 rounded-full transition-all duration-300 {i === carouselIndex ? 'bg-blue-600 w-4' : 'bg-gray-300 dark:bg-gray-600 w-2'}"
										></button>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
							<div class="h-48 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 flex items-center justify-center relative">
								<div class="absolute inset-0 flex items-center justify-center opacity-10">
									<Plane size={160} class="text-white rotate-12" />
								</div>
								<div class="relative text-center px-6">
									<p class="text-white/80 text-sm mb-2">No upcoming trips yet</p>
									<h2 class="text-2xl font-bold text-white mb-4">Where to next?</h2>
									<button onclick={() => goto('/trips')} class="bg-white text-blue-600 hover:bg-blue-50 text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow">
										Plan a trip
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- Open Balances -->
					<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
						<div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
									<Wallet size={14} class="text-blue-600" />
								</div>
								<h2 class="font-bold text-gray-800 dark:text-gray-100">Open Balances</h2>
							</div>
							{#if balances.length > 0}
								<div class="flex gap-3">
									{#if totalOwed > 0.005}
										<span class="text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-lg">
											+{totalOwed.toFixed(2)}
										</span>
									{/if}
									{#if totalOwe > 0.005}
										<span class="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-lg">
											−{totalOwe.toFixed(2)}
										</span>
									{/if}
								</div>
							{/if}
						</div>

						<div class="p-5">
							{#if balances.length === 0}
								<div class="flex items-center gap-3 py-2">
									<div class="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
										<CheckCircle size={18} class="text-green-600" />
									</div>
									<div>
										<p class="text-sm font-semibold text-gray-700 dark:text-gray-200">All settled up!</p>
										<p class="text-xs text-gray-400 dark:text-gray-500">No open balances across your trips.</p>
									</div>
								</div>
							{:else}
								<ul class="divide-y divide-gray-100 dark:divide-gray-700 -my-1">
									{#each balances as b (b.tripId)}
										<li>
											<button
												onclick={() => goto(`/trips/${b.tripId}?tab=expenses`)}
												class="w-full flex items-center justify-between py-3.5 px-2 -mx-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
											>
												<div class="flex items-center gap-3">
													<div class="w-9 h-9 rounded-full {b.amount > 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'} flex items-center justify-center shrink-0">
														{#if b.amount > 0}
															<TrendingUp size={16} class="text-green-600" />
														{:else}
															<TrendingDown size={16} class="text-red-500" />
														{/if}
													</div>
													<div>
														<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">{b.tripTitle}</p>
														<p class="text-xs {b.amount > 0 ? 'text-green-600' : 'text-red-500'} font-medium mt-0.5">
															{b.amount > 0 ? 'You are owed' : 'You owe'}
														</p>
													</div>
												</div>
												<div class="flex items-center gap-2">
													<span class="font-bold text-base {b.amount > 0 ? 'text-green-600' : 'text-red-500'}">
														{b.currency} {Math.abs(b.amount).toFixed(2)}
													</span>
													<ArrowRight size={14} class="text-gray-300 dark:text-gray-600" />
												</div>
											</button>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				</div>

				<!-- Right column: Activity Feed -->
				<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 self-start lg:sticky lg:top-4">
					<ActivityFeed
						entries={feedEntries}
						loading={feedLoading}
						error={feedError}
						onRefresh={fetchFeed}
					/>
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.carousel-slide-right {
		animation: slide-from-right 0.35s ease;
	}
	.carousel-slide-left {
		animation: slide-from-left 0.35s ease;
	}
	@keyframes slide-from-right {
		from { transform: translateX(100%); }
		to { transform: translateX(0); }
	}
	@keyframes slide-from-left {
		from { transform: translateX(-100%); }
		to { transform: translateX(0); }
	}
</style>
