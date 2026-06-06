<script>
	import { Plane } from 'lucide-svelte';
	let { title, subtitle = '', description = '', backHref = '', backLabel = 'Back', showDate = false, children, extra } = $props();

	const todayStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
</script>

<div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative overflow-hidden">
	<div class="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
		<Plane size={220} class="absolute -right-4 top-1/2 -translate-y-1/2 text-white opacity-[0.07] rotate-12" />
	</div>
	<div class="max-w-7xl mx-auto px-4 py-7 relative">
		{#if backHref}
			<a href={backHref} class="inline-flex items-center gap-1 text-white/70 hover:text-white text-sm mb-3 transition">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
				{backLabel}
			</a>
		{/if}
		<div class="flex items-center justify-between gap-8">
			<!-- Left: date + title + pills -->
			<div class="flex-1 min-w-0">
				{#if showDate}
					<p class="text-blue-200 text-sm font-medium mb-1">{todayStr}</p>
				{/if}
				<h1 class="text-4xl font-bold text-white">{title}</h1>
				{#if extra}
					<div class="mt-3 flex flex-wrap gap-2">
						{@render extra()}
					</div>
				{/if}
			</div>
			<!-- Right: subtitle + description + action button -->
			<div class="shrink-0 text-right flex flex-col items-end gap-3">
				{#if subtitle || description}
					<div>
						{#if subtitle}
							<p class="text-white font-semibold text-base">{subtitle}</p>
						{/if}
						{#if description}
							<p class="text-blue-100/80 text-sm mt-0.5">{description}</p>
						{/if}
					</div>
				{/if}
				{#if children}
					{@render children()}
				{/if}
			</div>
		</div>
	</div>
</div>
