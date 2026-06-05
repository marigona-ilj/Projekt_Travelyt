<script>
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';
	import { Moon, Sun } from 'lucide-svelte';

	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggleDark() {
		dark = !dark;
		if (dark) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}
</script>

<Header />

<main class="max-w-6xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
	<h1 class="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">Settings</h1>
	<p class="text-gray-600 dark:text-gray-300 mb-8">App preferences and configuration</p>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md">
		<h2 class="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>

		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				{#if dark}
					<Moon size={20} class="text-gray-400" />
				{:else}
					<Sun size={20} class="text-gray-500" />
				{/if}
				<div>
					<p class="font-semibold text-gray-800 dark:text-gray-100 text-sm">Dark Mode</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">{dark ? 'On' : 'Off'}</p>
				</div>
			</div>

			<button
				onclick={toggleDark}
				class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none {dark ? 'bg-blue-600' : 'bg-gray-300'}"
				role="switch"
				aria-checked={dark}
			>
				<span
					class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 {dark ? 'translate-x-6' : 'translate-x-0'}"
				></span>
			</button>
		</div>
	</div>
</main>
