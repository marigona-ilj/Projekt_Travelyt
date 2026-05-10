<script>
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';

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
</script>

<div
	{onclick}
	class="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
>
	<div class="h-32 {status === 'past' ? 'bg-gradient-to-r from-gray-400 to-gray-500' : status === 'ongoing' ? 'bg-gradient-to-r from-green-500 to-teal-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}"></div>
	<div class="p-4">
		<div class="flex justify-between items-start mb-2">
			<h3 class="text-xl font-bold text-gray-800">{trip.title}</h3>
			<span class="text-xs font-semibold px-2 py-0.5 rounded-full {statusConfig[status].classes}">
				{statusConfig[status].label}
			</span>
		</div>
		<p class="text-gray-600 mb-3">{trip.destination}</p>
		<div class="text-sm text-gray-500 mb-3">
			<p>📅 {formatDate(trip.startDate)} - {formatDate(trip.endDate)}</p>
			<p class="mt-1">⏱ {daysBetween(trip.startDate, trip.endDate)} days</p>
		</div>
		{#if trip.description}
			<p class="text-sm text-gray-600 line-clamp-2">{trip.description}</p>
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
