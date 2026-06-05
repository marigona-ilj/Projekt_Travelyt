<script>
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';
	import { Moon, Sun, Bell, Users, Receipt, Calendar, MessageSquare, Image, ShoppingBag } from 'lucide-svelte';

	let dark = $state(false);

	// Notification preferences
	let prefs = $state(null);
	let prefsLoading = $state(true);
	let saving = $state({});

	const NOTIFICATION_GROUPS = [
		{
			key: 'member_changes',
			icon: Users,
			label: 'Members',
			description: 'Someone joins or leaves a trip'
		},
		{
			key: 'expenses',
			icon: Receipt,
			label: 'Expenses',
			description: 'An expense is added, edited or removed'
		},
		{
			key: 'activities',
			icon: Calendar,
			label: 'Activities',
			description: 'A planned activity is added or changed'
		},
		{
			key: 'chat',
			icon: MessageSquare,
			label: 'Chat',
			description: 'New messages in a trip chat'
		},
		{
			key: 'photos',
			icon: Image,
			label: 'Gallery',
			description: 'Photos are uploaded or removed'
		},
		{
			key: 'packing',
			icon: ShoppingBag,
			label: 'Packing list',
			description: 'Items added to or removed from the packing list'
		}
	];

	onMount(async () => {
		dark = document.documentElement.classList.contains('dark');
		const res = await fetch('/api/user/notification-prefs');
		const data = await res.json();
		if (data.success) prefs = data.prefs;
		prefsLoading = false;
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

	async function togglePref(key) {
		if (!prefs) return;
		const newValue = !prefs[key];
		prefs = { ...prefs, [key]: newValue };
		saving = { ...saving, [key]: true };
		try {
			await fetch('/api/user/notification-prefs', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ [key]: newValue })
			});
		} catch {
			// revert on error
			prefs = { ...prefs, [key]: !newValue };
		} finally {
			saving = { ...saving, [key]: false };
		}
	}
</script>

<Header />

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen">
	<main class="max-w-2xl mx-auto px-4 py-8">
		<h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">Settings</h1>
		<p class="text-gray-500 dark:text-gray-400 mb-8 text-sm">App preferences</p>

		<!-- Appearance -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					{#if dark}
						<Moon size={18} class="text-gray-400" />
					{:else}
						<Sun size={18} class="text-yellow-500" />
					{/if}
					<div>
						<p class="font-medium text-gray-800 dark:text-gray-100 text-sm">Dark Mode</p>
						<p class="text-xs text-gray-500 dark:text-gray-400">{dark ? 'On' : 'Off'}</p>
					</div>
				</div>
				<button
					onclick={toggleDark}
					class="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 {dark ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
					role="switch"
					aria-checked={dark}
				>
					<span
						class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 {dark ? 'translate-x-5' : 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>

		<!-- Notifications -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
			<div class="flex items-center gap-2 mb-1">
				<Bell size={18} class="text-gray-500 dark:text-gray-400" />
				<h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">Notifications</h2>
			</div>
			<p class="text-xs text-gray-500 dark:text-gray-400 mb-5">Choose what shows up in your activity feed.</p>

			{#if prefsLoading}
				<div class="flex justify-center py-6">
					<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
				</div>
			{:else if prefs}
				<div class="divide-y divide-gray-100 dark:divide-gray-700">
					{#each NOTIFICATION_GROUPS as group}
						<div class="flex items-center justify-between py-3.5">
							<div class="flex items-center gap-3">
								<svelte:component this={group.icon} size={16} class="text-gray-400 dark:text-gray-500 shrink-0" />
								<div>
									<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{group.label}</p>
									<p class="text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
								</div>
							</div>
							<button
								onclick={() => togglePref(group.key)}
								disabled={saving[group.key]}
								class="relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 shrink-0 {prefs[group.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}"
								role="switch"
								aria-checked={prefs[group.key]}
							>
								<span
									class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 {prefs[group.key] ? 'translate-x-5' : 'translate-x-0'}"
								></span>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>
</div>
