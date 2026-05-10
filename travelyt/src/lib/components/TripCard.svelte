<script>
	import { formatDate, daysBetween } from '$lib/utils/helpers.js';

	export let trip;
</script>

<div
	class="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
>
	<div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-32"></div>
	<div class="p-4">
		<h3 class="text-xl font-bold text-gray-800 mb-2">{trip.title}</h3>
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
