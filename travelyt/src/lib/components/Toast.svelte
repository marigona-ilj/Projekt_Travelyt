<script>
	let { message = '', onUndo = null, visible = false, duration = 5000 } = $props();
</script>

{#if visible}
	<div
		role="status"
		class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 dark:bg-gray-700 text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[260px] max-w-sm overflow-hidden"
	>
		<span class="flex-1">{message}</span>
		{#if onUndo}
			<button
				onclick={onUndo}
				class="text-blue-400 hover:text-blue-300 font-semibold whitespace-nowrap transition"
			>
				Undo
			</button>
		{/if}
		<div
			class="absolute bottom-0 left-0 h-[3px] bg-blue-400"
			style="animation: toast-shrink {duration}ms linear forwards"
		></div>
	</div>
{/if}

<style>
	@keyframes toast-shrink {
		from { width: 100%; }
		to { width: 0%; }
	}
</style>
