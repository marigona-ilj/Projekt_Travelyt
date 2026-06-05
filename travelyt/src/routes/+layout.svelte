<script>
	import { page } from '$app/stores';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { children } = $props();
	let isAuthenticated = $state(false);
	let loading = $state(true);

	onMount(async () => {
		const saved = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		if (saved === 'dark' || (!saved && prefersDark)) {
			document.documentElement.classList.add('dark');
		}

		const response = await fetch('/api/auth');
		const data = await response.json();
		isAuthenticated = data.authenticated;
		loading = false;

		if (!isAuthenticated && !$page.url.pathname.includes('auth')) {
			goto('/auth');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<style>
		:global(body) {
			margin: 0;
			padding: 0;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
				sans-serif;
		}

		:global(.animate-spin) {
			animation: spin 1s linear infinite;
		}

		@keyframes spin {
			from {
				transform: rotate(0deg);
			}
			to {
				transform: rotate(360deg);
			}
		}
	</style>
</svelte:head>

{#if loading}
	<div class="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600 dark:text-gray-300">Loading...</p>
		</div>
	</div>
{:else if isAuthenticated || $page.url.pathname.includes('auth')}
	{@render children()}
{/if}
