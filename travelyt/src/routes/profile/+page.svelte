<script>
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';

	let user = $state(null);

	onMount(async () => {
		const response = await fetch('/api/auth');
		const data = await response.json();
		if (data.authenticated) {
			user = data.user;
		}
	});
</script>

<Header />

<main class="max-w-6xl mx-auto px-4 py-8 dark:bg-gray-900 min-h-screen">
	<h1 class="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-2">Profile</h1>
	<p class="text-gray-600 dark:text-gray-300 mb-8">Your account information</p>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900 p-6 max-w-md">
		{#if user}
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Name</label>
				<p class="text-gray-800 dark:text-gray-100 font-semibold">{user.name}</p>
			</div>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
				<p class="text-gray-800 dark:text-gray-100">{user.email}</p>
			</div>
		{:else}
			<p class="text-gray-500 dark:text-gray-400">Loading...</p>
		{/if}
	</div>
</main>
