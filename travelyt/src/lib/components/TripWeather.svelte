<script>
	import { Cloud } from 'lucide-svelte';

	let { legs = [] } = $props();

	let selectedIndex = $state(0);
	let forecast = $state([]);
	let loading = $state(true);
	let error = $state('');
	let mode = $state('');
	let partialNote = $state('');

	function parseLocalDate(str) {
		const [y, m, d] = String(str).split('T')[0].split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	function toDateString(d) {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function getWeatherInfo(code) {
		if (code === 0) return { label: 'Clear sky', icon: '☀️' };
		if (code === 1) return { label: 'Mainly clear', icon: '🌤️' };
		if (code === 2) return { label: 'Partly cloudy', icon: '⛅' };
		if (code === 3) return { label: 'Overcast', icon: '☁️' };
		if (code <= 48) return { label: 'Foggy', icon: '🌫️' };
		if (code <= 55) return { label: 'Drizzle', icon: '🌦️' };
		if (code <= 67) return { label: 'Rain', icon: '🌧️' };
		if (code <= 77) return { label: 'Snow', icon: '❄️' };
		if (code <= 82) return { label: 'Showers', icon: '🌧️' };
		if (code <= 86) return { label: 'Snow showers', icon: '🌨️' };
		if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
		return { label: 'Unknown', icon: '🌡️' };
	}

	function formatDayLabel(dateStr) {
		const d = parseLocalDate(dateStr);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const tomorrow = new Date(today);
		tomorrow.setDate(tomorrow.getDate() + 1);
		if (d.getTime() === today.getTime()) return 'Today';
		if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}

	function formatLegDateRange(leg) {
		const opts = { month: 'short', day: 'numeric' };
		const s = parseLocalDate(leg.startDate).toLocaleDateString('en-US', opts);
		const e = parseLocalDate(leg.endDate).toLocaleDateString('en-US', opts);
		return `${s} – ${e}`;
	}

	async function fetchWeather(lat, lon, start, end, useArchive) {
		const base = useArchive
			? 'https://archive-api.open-meteo.com/v1/archive'
			: 'https://api.open-meteo.com/v1/forecast';
		const params = new URLSearchParams({
			latitude: lat, longitude: lon,
			daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max',
			timezone: 'auto', start_date: start, end_date: end
		});
		const res = await fetch(`${base}?${params}`);
		if (!res.ok) throw new Error('Weather data unavailable');
		return (await res.json()).daily;
	}

	async function loadWeather(leg) {
		loading = true;
		forecast = [];
		error = '';
		mode = '';
		partialNote = '';

		if (leg.latitude == null || leg.longitude == null) {
			error = 'No location saved for this destination. Edit the trip to enable weather.';
			loading = false;
			return;
		}

		try {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const forecastLimit = new Date(today);
			forecastLimit.setDate(forecastLimit.getDate() + 16);

			const tripStart = parseLocalDate(leg.startDate);
			const tripEnd = parseLocalDate(leg.endDate);

			if (tripStart > forecastLimit) {
				mode = 'future';
				loading = false;
				return;
			}

			let fetchStart, fetchEnd, useArchive;
			if (tripEnd < today) {
				mode = 'archive';
				fetchStart = toDateString(tripStart);
				fetchEnd = toDateString(tripEnd);
				useArchive = true;
			} else if (tripEnd > forecastLimit) {
				mode = 'partial';
				fetchStart = toDateString(tripStart < today ? today : tripStart);
				fetchEnd = toDateString(forecastLimit);
				useArchive = false;
				partialNote = `Showing forecast up to ${forecastLimit.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. Check back for remaining days.`;
			} else {
				mode = 'forecast';
				fetchStart = toDateString(tripStart < today ? today : tripStart);
				fetchEnd = toDateString(tripEnd);
				useArchive = false;
			}

			const daily = await fetchWeather(leg.latitude, leg.longitude, fetchStart, fetchEnd, useArchive);
			forecast = daily.time.map((date, i) => ({
				date,
				code: daily.weathercode[i],
				maxTemp: Math.round(daily.temperature_2m_max[i]),
				minTemp: Math.round(daily.temperature_2m_min[i]),
				precipitation: daily.precipitation_sum[i] ?? 0,
				wind: Math.round(daily.windspeed_10m_max[i] ?? 0)
			}));
		} catch (err) {
			error = err.message || 'Failed to load weather data.';
		} finally {
			loading = false;
		}
	}

	// Default to current/upcoming leg
	$effect(() => {
		if (legs.length === 0) return;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const idx = legs.findIndex((leg) => parseLocalDate(leg.endDate) >= today);
		selectedIndex = idx >= 0 ? idx : legs.length - 1;
	});

	$effect(() => {
		const leg = legs[selectedIndex];
		if (leg) loadWeather(leg);
	});
</script>

<div>
	<div class="flex justify-between items-start mb-5">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
			<Cloud size={22} />
			Weather
		</h2>
		{#if legs[selectedIndex]?.resolvedLocation}
			<span class="text-sm text-gray-500 dark:text-gray-400 text-right">{legs[selectedIndex].resolvedLocation}</span>
		{/if}
	</div>

	{#if legs.length > 1}
		<div class="flex flex-wrap gap-2 mb-5">
			{#each legs as leg, i}
				<button
					onclick={() => (selectedIndex = i)}
					class="flex flex-col items-start px-3 py-2 rounded-xl border text-sm transition {selectedIndex === i
						? 'bg-blue-600 border-blue-600 text-white'
						: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'}"
				>
					<span class="font-semibold">{leg.destination}</span>
					<span class="text-[11px] opacity-75">{formatLegDateRange(leg)}</span>
				</button>
			{/each}
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-16 gap-3 text-gray-500 dark:text-gray-400">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
			<span class="text-sm">Fetching weather...</span>
		</div>
	{:else if error}
		<div class="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded text-sm">{error}</div>
	{:else if mode === 'future'}
		<div class="text-center py-14">
			<p class="text-gray-700 dark:text-gray-200 font-semibold mb-1">Forecast not yet available</p>
			<p class="text-gray-500 dark:text-gray-400 text-sm">Weather forecasts are available up to 16 days in advance. Check back closer to your trip.</p>
		</div>
	{:else if forecast.length === 0}
		<div class="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">No weather data available.</div>
	{:else}
		{#if mode === 'archive'}
			<div class="mb-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-3 py-2">
				Showing historical weather for this destination.
			</div>
		{/if}
		{#if partialNote}
			<div class="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{partialNote}</div>
		{/if}

		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each forecast as day}
				{@const info = getWeatherInfo(day.code)}
				<div class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center text-center gap-1">
					<p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{formatDayLabel(day.date)}</p>
					<p class="text-3xl my-1">{info.icon}</p>
					<p class="text-xs text-gray-600 dark:text-gray-300">{info.label}</p>
					<div class="flex items-baseline gap-1 mt-1">
						<span class="text-base font-bold text-gray-800 dark:text-gray-100">{day.maxTemp}°</span>
						<span class="text-sm text-gray-400 dark:text-gray-500">{day.minTemp}°</span>
					</div>
					{#if day.precipitation > 0}
						<p class="text-xs text-blue-500 font-medium">💧 {day.precipitation.toFixed(1)} mm</p>
					{/if}
					{#if day.wind > 0}
						<p class="text-xs text-gray-400 dark:text-gray-500">💨 {day.wind} km/h</p>
					{/if}
				</div>
			{/each}
		</div>

		<p class="text-xs text-gray-400 dark:text-gray-500 mt-4 text-right">
			Data: <a href="https://open-meteo.com" target="_blank" class="underline hover:text-gray-600 dark:hover:text-gray-400">Open-Meteo</a>
		</p>
	{/if}
</div>
