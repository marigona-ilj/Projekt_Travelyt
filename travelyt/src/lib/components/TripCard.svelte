<script>
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';
	import { Calendar, Clock, MapPin } from 'lucide-svelte';

	let { trip, onclick } = $props();

	const statusConfig = {
		ongoing:  { label: 'Ongoing',  classes: 'bg-green-100 text-green-700' },
		upcoming: { label: 'Upcoming', classes: 'bg-blue-100 text-blue-700' },
		past:     { label: 'Past',     classes: 'bg-gray-100 text-gray-500' }
	};

	let status = $derived.by(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const start = new Date(trip.startDate);
		const end = new Date(trip.endDate);
		if (now > end) return 'past';
		if (now >= start) return 'ongoing';
		return 'upcoming';
	});

	let gradientClass = $derived(
		status === 'past'
			? 'bg-gradient-to-r from-gray-400 to-gray-500'
			: status === 'ongoing'
				? 'bg-gradient-to-r from-green-500 to-teal-600'
				: 'bg-gradient-to-r from-blue-500 to-indigo-600'
	);

	let daysUntil = $derived.by(() => {
		if (status !== 'upcoming') return null;
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const [y, m, d] = String(trip.startDate).split('T')[0].split('-').map(Number);
		const start = new Date(y, m - 1, d);
		return Math.round((start - now) / (1000 * 60 * 60 * 24));
	});

	let countdownLabel = $derived(
		daysUntil === 1 ? 'Tomorrow' : daysUntil === 0 ? 'Today' : `In ${daysUntil} days`
	);

	let imageError = $state(false);
</script>

<div
	{onclick}
	class="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg dark:shadow-gray-900 transition cursor-pointer overflow-hidden"
>
	<div class="h-36 relative overflow-hidden">
		{#if trip.coverImage && !imageError}
			<img
				src={trip.coverImage}
				alt={trip.title}
				class="w-full h-full object-cover"
				onerror={() => (imageError = true)}
			/>
		{:else}
			<div class="w-full h-full {gradientClass}"></div>
		{/if}
	</div>
	<div class="p-4">
		<div class="flex justify-between items-start mb-2">
			<h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">{trip.title}</h3>
			<span class="text-xs font-semibold px-2 py-0.5 rounded-full {statusConfig[status].classes}">
				{statusConfig[status].label}
			</span>
		</div>
		<p class="text-gray-600 dark:text-gray-300 mb-3">{trip.destination}</p>
		<div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
			<p class="flex items-center gap-1"><Calendar size={14} /> {formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
			<p class="flex items-center gap-1 mt-1"><Clock size={14} /> {daysBetween(trip.startDate, trip.endDate)} days</p>
		</div>
		{#if daysUntil !== null}
			<p class="text-sm font-semibold text-blue-600">{countdownLabel}</p>
		{/if}
		{#if trip.description}
			<p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{trip.description}</p>
		{/if}
	</div>
</div>

<style>
	:global(.line-clamp-2) {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
