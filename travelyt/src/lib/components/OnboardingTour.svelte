<script>
	import { onMount } from 'svelte';
	import { ChevronRight, ChevronLeft, X, LayoutDashboard, MapPin, CalendarDays, Bell, UserCircle, Settings } from 'lucide-svelte';

	const STEPS = [
		{
			selector: '[data-tour="dashboard"]',
			icon: LayoutDashboard,
			title: 'Dashboard',
			description: 'Your home base. See your next trip with a countdown, open balances across all trips, and a live activity feed — all at a glance.'
		},
		{
			selector: '[data-tour="trips"]',
			icon: MapPin,
			title: 'My Trips',
			description: 'Create and manage all your trips here. Filter by upcoming, ongoing or past, and tap any trip to open the full planning workspace.'
		},
		{
			selector: '[data-tour="calendar"]',
			icon: CalendarDays,
			title: 'Calendar',
			description: 'See all your trips on a monthly calendar as colored bars. Click any day to start planning a new trip directly from the calendar.'
		},
		{
			selector: '[data-tour="feed"]',
			icon: Bell,
			title: 'Activity Feed',
			description: 'Stay updated on everything happening in your trips — new expenses, chat messages, members joining, and more. Adjust what you see in Settings.'
		},
		{
			selector: '[data-tour="profile"]',
			icon: UserCircle,
			title: 'Profile',
			description: 'Update your name and profile photo or change your password.'
		},
		{
			selector: '[data-tour="settings"]',
			icon: Settings,
			title: 'Settings',
			description: 'Toggle dark mode and choose which events trigger notifications in your activity feed.'
		}
	];

	let step = $state(0);
	let visible = $state(false);
	let rect = $state(null);
	let highlighted = null;

	const TOOLTIP_W = 300;

	onMount(() => {
		if (localStorage.getItem('tour_done')) return;
		setTimeout(() => {
			visible = true;
			applyStep(0);
		}, 600);
	});

	function applyStep(index) {
		if (highlighted) {
			highlighted.classList.remove('tour-ring');
			highlighted = null;
		}
		rect = null;

		const el = document.querySelector(STEPS[index].selector);
		if (!el) return;

		el.classList.add('tour-ring');
		highlighted = el;
		rect = el.getBoundingClientRect();
	}

	function next() {
		if (step < STEPS.length - 1) {
			step++;
			applyStep(step);
		} else {
			finish();
		}
	}

	function prev() {
		if (step > 0) {
			step--;
			applyStep(step);
		}
	}

	function finish() {
		if (highlighted) highlighted.classList.remove('tour-ring');
		localStorage.setItem('tour_done', '1');
		visible = false;
	}

	function tooltipLeft(r) {
		if (!r) return 0;
		let left = r.left;
		const vw = window.innerWidth;
		if (left + TOOLTIP_W > vw - 8) left = vw - TOOLTIP_W - 8;
		if (left < 8) left = 8;
		return left;
	}

	function arrowLeft(r) {
		if (!r) return 16;
		const tl = tooltipLeft(r);
		const center = r.left + r.width / 2;
		const offset = center - tl - 8;
		return Math.max(12, Math.min(TOOLTIP_W - 28, offset));
	}
</script>

{#if visible}
	<!-- Backdrop (below header z-50) -->
	<div class="fixed inset-0 bg-black/40 z-40 pointer-events-none"></div>

	<!-- Skip -->
	<button
		onclick={finish}
		class="fixed top-3 right-20 z-[60] flex items-center gap-1 text-xs font-medium text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-full transition"
	>
		<X size={12} /> Skip tour
	</button>

	<!-- Tooltip -->
	{#if rect}
		<div
			class="fixed z-[60] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-5"
			style="left: {tooltipLeft(rect)}px; top: {rect.bottom + 14}px; width: {TOOLTIP_W}px;"
		>
			<!-- Arrow -->
			<div
				class="absolute -top-[7px] w-3.5 h-3.5 bg-white dark:bg-gray-800 border-l border-t border-gray-100 dark:border-gray-700 rotate-45"
				style="left: {arrowLeft(rect)}px;"
			></div>

			<!-- Step badge -->
			<div class="flex items-center gap-2 mb-2.5">
				<div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center">
					<svelte:component this={STEPS[step].icon} size={14} class="text-blue-600 dark:text-blue-400" />
				</div>
				<span class="font-bold text-sm text-gray-800 dark:text-gray-100">{STEPS[step].title}</span>
				<span class="ml-auto text-xs text-gray-400 dark:text-gray-500 tabular-nums">{step + 1} / {STEPS.length}</span>
			</div>

			<p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{STEPS[step].description}</p>

			<!-- Progress dots -->
			<div class="flex items-center gap-1.5 mb-4">
				{#each STEPS as _, i}
					<div class="rounded-full transition-all {i === step ? 'w-4 h-1.5 bg-blue-600' : 'w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600'}"></div>
				{/each}
			</div>

			<!-- Buttons -->
			<div class="flex items-center gap-2">
				{#if step > 0}
					<button
						onclick={prev}
						class="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
					>
						<ChevronLeft size={13} /> Back
					</button>
				{/if}
				<button
					onclick={next}
					class="ml-auto flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
				>
					{step < STEPS.length - 1 ? 'Next' : 'Done'} <ChevronRight size={13} />
				</button>
			</div>
		</div>
	{/if}
{/if}

<style>
	:global(.tour-ring) {
		position: relative;
		z-index: 41;
		border-radius: 8px;
		outline: 2px solid #3B82F6;
		outline-offset: 3px;
		box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.2);
	}
</style>
