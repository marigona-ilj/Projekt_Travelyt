<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Plane, Bell, LogOut, User, Settings } from 'lucide-svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';

	const navLinks = [
		{ href: '/', label: 'Dashboard', exact: true },
		{ href: '/trips', label: 'My Trips' },
		{ href: '/calendar', label: 'Calendar' }
	];

	function isActive(link) {
		const path = $page.url.pathname;
		if (link.exact) return path === link.href;
		return path === link.href || path.startsWith(link.href + '/');
	}

	let feedOpen = $state(false);
	let userMenuOpen = $state(false);
	let userName = $state('');
	let userAvatar = $state('');

	let entries = $state([]);
	let feedLoading = $state(false);
	let feedError = $state('');
	let lastSeen = $state(null);
	let intervalId;

	let initials = $derived(
		userName
			.trim()
			.split(' ')
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	);

	let unreadCount = $derived(
		!lastSeen ? 0 : entries.filter((e) => new Date(e.createdAt) > new Date(lastSeen)).length
	);

	async function fetchFeed() {
		try {
			const res = await fetch('/api/feed');
			const data = await res.json();
			if (data.success) {
				entries = data.entries;
				feedError = '';
			} else {
				feedError = data.error || 'Failed to load feed';
			}
		} catch {
			feedError = 'Network error';
		} finally {
			feedLoading = false;
		}
	}

	$effect(() => {
		feedLoading = true;
		const stored = localStorage.getItem('feed_seen_global');
		if (!stored) {
			const now = new Date().toISOString();
			localStorage.setItem('feed_seen_global', now);
			lastSeen = now;
		} else {
			lastSeen = stored;
		}
		fetchFeed();
		intervalId = setInterval(fetchFeed, 12000);
		return () => clearInterval(intervalId);
	});

	onMount(async () => {
		try {
			const res = await fetch('/api/user');
			const data = await res.json();
			if (data.success) {
				userName = data.name;
				userAvatar = data.avatar;
			}
		} catch {}
	});

	function toggleFeed() {
		feedOpen = !feedOpen;
		userMenuOpen = false;
		if (feedOpen) {
			const now = new Date().toISOString();
			localStorage.setItem('feed_seen_global', now);
			lastSeen = now;
		}
	}

	function toggleUserMenu() {
		userMenuOpen = !userMenuOpen;
		feedOpen = false;
	}

	async function logout() {
		await fetch('/api/auth', { method: 'DELETE' });
		goto('/login');
	}
</script>

<header class="sticky top-0 z-50 bg-white border-b border-gray-200 dark:!bg-gray-900 dark:border-gray-700">
	<div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-6">

		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 shrink-0 no-underline">
			<div class="text-blue-600"><Plane size={22} /></div>
			<span class="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Travelyt</span>
		</a>

		<!-- Main nav -->
		<nav class="flex items-center gap-1">
			{#each navLinks as link}
				<a
					href={link.href}
					data-tour={link.href === '/' ? 'dashboard' : link.href === '/trips' ? 'trips' : link.href === '/calendar' ? 'calendar' : undefined}
					class="relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors {isActive(link)
						? 'text-blue-600 dark:text-blue-400'
						: 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'}"
				>
					{link.label}
					{#if isActive(link)}
						<span class="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Right: Bell + Avatar -->
		<div class="flex items-center gap-2 shrink-0">

			<!-- Bell -->
			<div class="relative">
				<button
					onclick={toggleFeed}
					data-tour="feed"
					class="relative p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
					title="Notifications"
				>
					<Bell size={20} />
					{#if unreadCount > 0}
						<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
					{/if}
				</button>

				{#if feedOpen}
					<div class="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
						<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
							<h3 class="font-semibold text-sm text-gray-800 dark:text-gray-100">Notifications</h3>
							{#if unreadCount > 0}
								<span class="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold px-2 py-0.5 rounded-full">{unreadCount} new</span>
							{/if}
						</div>
						<div class="p-4 max-h-[480px] overflow-y-auto">
							<ActivityFeed {entries} loading={feedLoading} error={feedError} onRefresh={fetchFeed} onNavigate={() => (feedOpen = false)} />
						</div>
					</div>
				{/if}
			</div>

			<!-- User avatar -->
			<div class="relative">
				<button
					onclick={toggleUserMenu}
					data-tour="user-menu"
					class="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					{#if userAvatar}
						<img src={userAvatar} alt={userName} class="w-7 h-7 rounded-full object-cover" />
					{:else}
						<div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
							{initials || '?'}
						</div>
					{/if}
					<span class="text-sm font-medium text-gray-700 dark:text-gray-200 max-w-[100px] truncate hidden sm:block">{userName || 'Account'}</span>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400"><path d="M6 9l6 6 6-6"/></svg>
				</button>

				{#if userMenuOpen}
					<div class="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 py-1">
						<a
							href="/profile"
							onclick={() => (userMenuOpen = false)}
							data-tour="profile"
							class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							<User size={15} class="text-gray-400" /> Profile
						</a>
						<a
							href="/settings"
							onclick={() => (userMenuOpen = false)}
							data-tour="settings"
							class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
						>
							<Settings size={15} class="text-gray-400" /> Settings
						</a>
						<div class="my-1 border-t border-gray-100 dark:border-gray-700"></div>
						<button
							onclick={logout}
							class="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
						>
							<LogOut size={15} /> Sign out
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>

{#if feedOpen || userMenuOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onclick={() => { feedOpen = false; userMenuOpen = false; }}
	></div>
{/if}
