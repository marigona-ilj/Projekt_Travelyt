<script>
	let { title, subtitle = '', description = '', backHref = '', backLabel = 'Back', children } = $props();
</script>

<div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative">
	<div class="max-w-6xl mx-auto px-4 py-5 relative flex items-center justify-between gap-4">
		<div>
			{#if backHref}
				<a href={backHref} class="inline-flex items-center gap-1 text-white/70 hover:text-white text-xs mb-2 transition">
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
					{backLabel}
				</a>
			{/if}
			<h1 class="text-2xl font-bold text-white">{title}</h1>
			{#if subtitle}
				<p class="text-blue-200 text-sm mt-0.5">{subtitle}</p>
			{/if}
			{#if description}
				<p class="text-white/80 text-sm mt-1 italic">{description}</p>
			{/if}
		</div>
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
