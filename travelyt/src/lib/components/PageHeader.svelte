<script>
	let { title, subtitle = '', description = '', children } = $props();
</script>

<div class="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 relative">
	<div class="max-w-6xl mx-auto px-4 py-5 relative flex items-center justify-between gap-4">
		<div>
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
