<script>
	import { page } from '$app/stores';
	import { Plane, Bell } from 'lucide-svelte';
	import ActivityFeed from '$lib/components/ActivityFeed.svelte';

	async function logout() {
		document.cookie = 'userId=; Max-Age=0; Path=/;';
		window.location.href = '/auth';
	}

	const navLinks = [
		{ href: '/trips', label: 'My Trips' },
		{ href: '/profile', label: 'Profile' },
		{ href: '/settings', label: 'Settings' }
	];

	let feedOpen = $state(false);
	let tripId = $derived($page.params.tripId ?? null);
</script>

<header class="bg-white shadow-sm relative z-50">
	<div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
		<a href="/trips" class="flex items-center gap-2 no-underline">
			<div class="text-blue-600"><Plane size={28} /></div>
			<span class="text-2xl font-bold text-gray-800">Travelyt</span>
		</a>

		<nav class="flex items-center gap-1">
			{#each navLinks as link}
				<a
					href={link.href}
					class="px-4 py-2 rounded-lg font-semibold transition {$page.url.pathname === link.href || ($page.url.pathname.startsWith(link.href) && link.href !== '/')
						? 'bg-blue-50 text-blue-600'
						: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}"
				>
					{link.label}
				</a>
			{/each}

			{#if tripId}
				<div class="relative">
					<button
						onclick={() => (feedOpen = !feedOpen)}
						class="p-2 rounded-lg transition {feedOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}"
						title="Activity Feed"
					>
						<Bell size={20} />
					</button>

					{#if feedOpen}
						<div class="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-h-96 overflow-y-auto">
							<ActivityFeed {tripId} />
						</div>
					{/if}
				</div>
			{/if}
		</nav>

		<button
			onclick={logout}
			class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
		>
			Logout
		</button>
	</div>
</header>

{#if feedOpen}
	<div
		class="fixed inset-0 z-40"
		role="presentation"
		onclick={() => (feedOpen = false)}
	></div>
{/if}
