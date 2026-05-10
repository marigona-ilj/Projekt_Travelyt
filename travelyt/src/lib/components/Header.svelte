<script>
	import { page } from '$app/stores';
	import { Plane } from 'lucide-svelte';

	async function logout() {
		document.cookie = 'userId=; Max-Age=0; Path=/;';
		window.location.href = '/auth';
	}

	const navLinks = [
		{ href: '/trips', label: 'My Trips' },
		{ href: '/profile', label: 'Profile' },
		{ href: '/settings', label: 'Settings' }
	];
</script>

<header class="bg-white shadow-sm">
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
		</nav>

		<button
			onclick={logout}
			class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
		>
			Logout
		</button>
	</div>
</header>
