<script>
	import { goto } from '$app/navigation';

	async function logout() {
		// Clear session by redirecting to auth
		await fetch('/api/auth', { method: 'POST' });
		document.cookie = 'userId=; Max-Age=0;';
		goto('/auth');
	}
</script>

<header class="bg-white shadow-sm">
	<div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
		<div class="flex items-center gap-2">
			<div class="text-2xl font-bold text-blue-600">✈️</div>
			<h1 class="text-2xl font-bold text-gray-800">Travelyt</h1>
		</div>
		<button
			onclick={logout}
			class="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
		>
			Logout
		</button>
	</div>
</header>
