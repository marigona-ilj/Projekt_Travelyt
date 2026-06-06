<script>
	import { page } from '$app/stores';
	import { Plane, Bell } from 'lucide-svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';

	const navLinks = [
		{ href: '/', label: 'Dashboard', exact: true },
		{ href: '/trips', label: 'My Trips' },
		{ href: '/calendar', label: 'Calendar' },
		{ href: '/profile', label: 'Profile' },
		{ href: '/settings', label: 'Settings' }
	];

	function isActive(link) {
		const path = $page.url.pathname;
		if (link.exact) return path === link.href;
		return path === link.href || path.startsWith(link.href + '/');
	}

	let feedOpen = $state(false);
	let tripId = $derived($page.params.tripId ?? null);
	let entries = $state([]);
	let feedLoading = $state(false);
	let feedError = $state('');
	let lastSeen = $state(null);
	let intervalId;

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

	function toggleFeed() {
		feedOpen = !feedOpen;
		if (feedOpen) {
			const now = new Date().toISOString();
			localStorage.setItem('feed_seen_global', now);
			lastSeen = now;
		}
	}
</script>

<header class="sticky top-0 z-50 bg-white border-b border-gray-200 dark:!bg-gray-900 dark:border-gray-700">
	<div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
		<a href="/" class="flex items-center gap-2 no-underline">
			<div class="text-blue-600"><Plane size={28} /></div>
			<span class="text-2xl font-bold text-gray-800 dark:text-gray-100">Travelyt</span>
		</a>

		<nav class="flex items-center gap-1">
			{#each navLinks as link}
				<a
					href={link.href}
					data-tour={link.href === '/' ? 'dashboard' : link.href === '/trips' ? 'trips' : link.href === '/calendar' ? 'calendar' : link.href === '/profile' ? 'profile' : link.href === '/settings' ? 'settings' : undefined}
					class="px-4 py-2 rounded-lg font-semibold transition {isActive(link)
						? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
						: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'}"
				>
					{link.label}
				</a>
			{/each}

			<div class="relative">
				<button
					onclick={toggleFeed}
					data-tour="feed"
					class="relative p-2 rounded-lg transition {feedOpen ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700'}"
					title="Activity Feed"
				>
					<Bell size={22} />
					{#if unreadCount > 0}
						<span class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					{/if}
				</button>

				{#if feedOpen}
					<div class="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
						<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
							<h3 class="font-semibold text-gray-800 dark:text-gray-100">Activity Feed</h3>
						</div>
						<div class="p-4 max-h-[480px] overflow-y-auto">
							<ActivityFeed {entries} loading={feedLoading} error={feedError} onRefresh={fetchFeed} onNavigate={() => (feedOpen = false)} />
						</div>
					</div>
				{/if}
			</div>
		</nav>
	</div>
</header>

{#if feedOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onclick={() => (feedOpen = false)}
	></div>
{/if}
