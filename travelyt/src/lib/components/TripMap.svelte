<script>
	import { onMount, onDestroy } from 'svelte';

	let { tripId, centerLat, centerLon, legs = [] } = $props();

	let mapContainer = $state(null);
	let status = $state('loading'); // 'loading' | 'geocoding' | 'done' | 'empty' | 'error'
	let errorMsg = $state('');
	let progress = $state(0);
	let total = $state(0);
	let map = null;
	let markers = [];

	async function geocode(location) {
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`
			);
			const data = await res.json();
			if (!data.length) return null;
			return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
		} catch {
			return null;
		}
	}

	function parseLocalDate(str) {
		const [y, m, d] = String(str).split('T')[0].split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	function delay(ms) {
		return new Promise((r) => setTimeout(r, ms));
	}

	function formatDate(str) {
		const [y, m, d] = String(str).split('T')[0].split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
			weekday: 'short', month: 'short', day: 'numeric'
		});
	}

	function injectScript(src, id) {
		if (document.getElementById(id)) return Promise.resolve();
		return new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.id = id;
			script.src = src;
			script.onload = resolve;
			script.onerror = reject;
			document.head.appendChild(script);
		});
	}

	function injectCSS(href, id) {
		if (document.getElementById(id)) return Promise.resolve();
		return new Promise((resolve) => {
			const link = document.createElement('link');
			link.id = id;
			link.rel = 'stylesheet';
			link.href = href;
			link.onload = resolve;
			link.onerror = resolve; // continue even if CSS fails
			document.head.appendChild(link);
			setTimeout(resolve, 2000); // fallback
		});
	}

	onMount(async () => {
		try {
			const res = await fetch(`/api/trips/${tripId}/activities`);
			const data = await res.json();
			const withLocation = (data.activities || []).filter((a) => a.location?.trim());
			const hasGeoLegs = legs.some((l) => l.latitude != null);

			if (withLocation.length === 0 && !hasGeoLegs) {
				status = 'empty';
				return;
			}

			await injectCSS('https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css', 'maplibre-css');
			await injectScript('https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js', 'maplibre-js');
			const maplibregl = window.maplibregl;

			const firstGeoLeg = legs.find((l) => l.longitude != null);
			const initCenter = firstGeoLeg ? [firstGeoLeg.longitude, firstGeoLeg.latitude]
				: centerLon != null ? [centerLon, centerLat] : [0, 20];
			const initZoom = (firstGeoLeg || centerLon != null) ? (legs.length > 1 ? 4 : 9) : 2;

			map = new maplibregl.Map({
				container: mapContainer,
				style: 'https://tiles.openfreemap.org/styles/bright',
				center: initCenter,
				zoom: initZoom,
				attributionControl: false
			});

			map.addControl(new maplibregl.AttributionControl({ compact: true }));

			// Wait for map to load, but don't hang forever
			await Promise.race([
				new Promise((resolve, reject) => {
					map.on('load', resolve);
					map.on('error', (e) => reject(new Error(e.error?.message || 'Map failed to load')));
				}),
				new Promise((_, reject) => setTimeout(() => reject(new Error('Map load timeout')), 15000))
			]);

			// Add leg destination markers and route line first
			const legPoints = [];
			const geoLegs = legs.filter((l) => l.latitude != null && l.longitude != null);
			for (let i = 0; i < geoLegs.length; i++) {
				const leg = geoLegs[i];
				const coords = [leg.longitude, leg.latitude];
				legPoints.push(coords);

				const el = document.createElement('div');
				el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer';
				el.innerHTML = `
					<div style="background:#1d4ed8;color:white;font-family:system-ui,sans-serif;font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;box-shadow:0 3px 12px rgba(29,78,216,0.5);white-space:nowrap;letter-spacing:0.01em">${geoLegs.length > 1 ? (i + 1) + '. ' : ''}${leg.destination}</div>
					<div style="width:2px;height:8px;background:#1d4ed8"></div>
					<div style="width:11px;height:11px;background:#1d4ed8;border-radius:50%;box-shadow:0 0 0 3px white,0 2px 8px rgba(0,0,0,0.25)"></div>
				`;

				const start = parseLocalDate(leg.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
				const end = parseLocalDate(leg.endDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });

				new maplibregl.Marker({ element: el, anchor: 'bottom' })
					.setLngLat(coords)
					.setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
						<div style="font-family:system-ui,sans-serif;min-width:140px">
							<strong style="font-size:13px">${leg.destination}</strong><br>
							<span style="font-size:11px;color:#6b7280">${start} – ${end}</span>
							${leg.resolvedLocation ? `<div style="font-size:11px;color:#9ca3af;margin-top:2px">${leg.resolvedLocation}</div>` : ''}
						</div>
					`))
					.addTo(map);
			}

			if (legPoints.length > 1) {
				map.addSource('legs-route', {
					type: 'geojson',
					data: { type: 'Feature', geometry: { type: 'LineString', coordinates: legPoints } }
				});
				map.addLayer({
					id: 'legs-route',
					type: 'line',
					source: 'legs-route',
					paint: { 'line-color': '#2563eb', 'line-width': 2, 'line-dasharray': [4, 4] }
				});
			}

			if (withLocation.length === 0 && legPoints.length > 0) {
				if (legPoints.length > 1) {
					const bounds = legPoints.reduce(
						(b, p) => b.extend(p),
						new maplibregl.LngLatBounds(legPoints[0], legPoints[0])
					);
					map.fitBounds(bounds, { padding: 80, maxZoom: 10 });
				} else {
					map.flyTo({ center: legPoints[0], zoom: 10 });
				}
				status = 'done';
				return;
			}

			if (withLocation.length === 0) {
				status = 'empty';
				return;
			}

			total = withLocation.length;
			status = 'geocoding';
			const points = [...legPoints];

			for (const activity of withLocation) {
				const coords = await geocode(activity.location);
				progress += 1;

				if (coords) {
					points.push(coords);

					const label = activity.title.length > 24
						? activity.title.slice(0, 23) + '…'
						: activity.title;

					const el = document.createElement('div');
					el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer';
					el.innerHTML = `
						<div style="background:#2563eb;color:white;font-family:system-ui,sans-serif;font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;box-shadow:0 3px 12px rgba(37,99,235,0.45);white-space:nowrap;letter-spacing:0.01em">${label}</div>
						<div style="width:2px;height:8px;background:#2563eb"></div>
						<div style="width:9px;height:9px;background:#2563eb;border-radius:50%;box-shadow:0 0 0 2.5px white,0 2px 6px rgba(0,0,0,0.2)"></div>
					`;

					const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
						.setHTML(`
							<div style="font-family:system-ui,sans-serif;min-width:160px">
								<strong style="font-size:13px">${activity.title}</strong><br>
								<span style="font-size:11px;color:#6b7280">${formatDate(activity.date)}${activity.time ? ' · ' + activity.time : ''}</span>
								<div style="font-size:12px;color:#374151;margin-top:4px">📍 ${activity.location}</div>
								${activity.description ? `<div style="font-size:11px;color:#6b7280;margin-top:3px">${activity.description}</div>` : ''}
							</div>
						`);

					new maplibregl.Marker({ element: el, anchor: 'bottom' })
						.setLngLat(coords)
						.setPopup(popup)
						.addTo(map);
				}

				if (progress < total) await delay(1100);
			}

			if (points.length > 1) {
				const bounds = points.reduce(
					(b, p) => b.extend(p),
					new maplibregl.LngLatBounds(points[0], points[0])
				);
				map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
			} else if (points.length === 1) {
				map.flyTo({ center: points[0], zoom: 14 });
			}

			status = 'done';
		} catch (err) {
			console.error('Map error:', err);
			errorMsg = err.message || 'Failed to load map';
			status = 'error';
		}
	});

	onDestroy(() => {
		map?.remove();
	});
</script>

<div>
	<div class="flex justify-between items-center mb-5">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Map</h2>
		{#if status === 'geocoding'}
			<span class="text-sm text-gray-500">{progress} / {total} locations resolved</span>
		{/if}
	</div>

	<div
		bind:this={mapContainer}
		class="w-full rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
		style="height: 520px; display: {status === 'empty' || status === 'error' || status === 'loading' ? 'none' : 'block'};"
	></div>

	{#if status === 'loading'}
		<div class="flex items-center justify-center gap-3 text-gray-500 py-16">
			<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
			<span class="text-sm">Loading map...</span>
		</div>
	{:else if status === 'error'}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded text-sm">
			{errorMsg}
		</div>
	{:else if status === 'geocoding'}
		<div class="mt-3">
			<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
				<div class="bg-blue-500 h-1.5 rounded-full transition-all" style="width:{(progress/total)*100}%"></div>
			</div>
			<p class="text-xs text-gray-400 mt-1">Resolving locations...</p>
		</div>
	{:else if status === 'empty'}
		<div class="text-center py-16 text-gray-400">
			<p class="font-semibold text-gray-600 dark:text-gray-300 mb-1">No locations to show</p>
			<p class="text-sm">Add a location to your activities and they will appear here.</p>
		</div>
	{:else if status === 'done'}
		<p class="text-xs text-gray-400 mt-2 text-right">
			Map: <a href="https://openfreemap.org" target="_blank" class="underline hover:text-gray-600 dark:hover:text-gray-300">OpenFreeMap</a>
			· © <a href="https://www.openstreetmap.org/copyright" target="_blank" class="underline hover:text-gray-600 dark:hover:text-gray-300">OpenStreetMap</a>
		</p>
	{/if}
</div>
