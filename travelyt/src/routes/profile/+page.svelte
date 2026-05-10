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

<main class="max-w-6xl mx-auto px-4 py-8">
	<h1 class="text-4xl font-bold text-gray-800 mb-2">Profile</h1>
	<p class="text-gray-600 mb-8">Your account information</p>

	<div class="bg-white rounded-lg shadow-md p-6 max-w-md">
		{#if user}
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
				<p class="text-gray-800 font-semibold">{user.name}</p>
			</div>
			<div class="mb-4">
				<label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<p class="text-gray-800">{user.email}</p>
			</div>
		{:else}
			<p class="text-gray-500">Loading...</p>
		{/if}
	</div>
</main>
