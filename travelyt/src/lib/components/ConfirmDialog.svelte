<script>
	let { open = false, title = '', message = '', confirmLabel = 'Delete', onconfirm = () => {}, oncancel = () => {} } = $props();
</script>

{#if open}
	<div
		class="fixed inset-0 z-[80] flex items-center justify-center p-4"
		role="presentation"
		onclick={oncancel}
	>
		<div class="absolute inset-0 bg-black/40"></div>
		<div
			class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
			role="dialog"
			aria-modal="true"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
			{#if message}
				<p class="text-sm text-gray-500 dark:text-gray-400 mb-5">{message}</p>
			{/if}
			<div class="flex gap-2 justify-end">
				<button
					onclick={oncancel}
					class="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
				>
					Cancel
				</button>
				<button
					onclick={onconfirm}
					class="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
