<script>
	let { value = $bindable(''), onlocationselect, inputClass = '' } = $props();

	let suggestions = $state([]);
	let showSuggestions = $state(false);
	let fetchLoading = $state(false);
	let debounceTimer;

	async function fetchSuggestions(query) {
		if (query.length < 2) {
			suggestions = [];
			return;
		}
		fetchLoading = true;
		try {
			const res = await fetch(
				`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
			);
			const data = await res.json();
			suggestions = data.results || [];
		} catch {
			suggestions = [];
		} finally {
			fetchLoading = false;
		}
	}

	function handleInput(e) {
		value = e.target.value;
		showSuggestions = true;
		onlocationselect(null);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchSuggestions(value), 300);
	}

	function selectSuggestion(s) {
		const admin1 = s.admin1 !== s.name ? s.admin1 : null;
		const parts = [s.name, admin1, s.country].filter(Boolean);
		value = parts.join(', ');
		showSuggestions = false;
		suggestions = [];
		onlocationselect({ latitude: s.latitude, longitude: s.longitude, resolvedLocation: value });
	}

	function handleBlur() {
		setTimeout(() => {
			showSuggestions = false;
		}, 150);
	}

	function formatSuggestion(s) {
		const admin1 = s.admin1 !== s.name ? s.admin1 : null;
		const sub = [admin1, s.country].filter(Boolean).join(', ');
		return { main: s.name, sub };
	}
</script>

<div class="relative">
	<input
		type="text"
		value={value}
		oninput={handleInput}
		onblur={handleBlur}
		onfocus={() => { if (value.length >= 2) showSuggestions = true; }}
		placeholder="e.g., Lisbon, Portugal"
		autocomplete="off"
		class={inputClass}
		required
	/>

	{#if showSuggestions && (suggestions.length > 0 || fetchLoading)}
		<ul class="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
			{#if fetchLoading && suggestions.length === 0}
				<li class="px-3 py-2 text-sm text-gray-400">Searching...</li>
			{/if}
			{#each suggestions as s}
				{@const fmt = formatSuggestion(s)}
				<li>
					<button
						type="button"
						onmousedown={() => selectSuggestion(s)}
						class="w-full text-left px-3 py-2 hover:bg-blue-50 flex flex-col gap-0.5"
					>
						<span class="text-sm font-medium text-gray-800">{fmt.main}</span>
						{#if fmt.sub}
							<span class="text-xs text-gray-500">{fmt.sub}</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
