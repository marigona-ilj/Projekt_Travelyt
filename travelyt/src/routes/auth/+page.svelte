<script>

import { page } from '$app/stores';

let email = $state('');
let password = $state('');
let name = $state('');
let confirmPassword = $state('');
let isLogin = $state(true);
let loading = $state(false);
let error = $state('');

let redirect = $derived($page.url.searchParams.get('redirect') ?? '');
let isTripInvite = $derived(redirect.includes('/trips/join/'));
	async function handleSubmit(event) {
		event?.preventDefault?.();
		error = '';
		loading = true;

		const endpoint = isLogin ? '/api/auth?action=login' : '/api/auth?action=register';
		const payload = isLogin ? { email, password } : { email, password, confirmPassword, name };

		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			const data = await response.json();

			if (data.success) {
				const redirect = $page.url.searchParams.get('redirect');
				// After registration: go to pending invites page first if there are any
				if (!isLogin && data.pendingInviteCount > 0) {
					window.location.href = `/join/pending${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;
				} else {
					window.location.href = redirect || '/';
				}
			} else {
				error = data.error || 'An error occurred';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}

	function toggleMode() {
		isLogin = !isLogin;
		error = '';
		email = '';
		password = '';
		confirmPassword = '';
		name = '';
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md">
		{#if isTripInvite}
			<div class="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 mb-6">
				<span class="text-2xl">✈️</span>
				<div>
					<p class="text-sm font-semibold text-blue-800 dark:text-blue-300">You've been invited to a trip!</p>
					<p class="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Sign in or create an account to join.</p>
				</div>
			</div>
		{/if}
		<h1 class="text-3xl font-bold text-center mb-2 text-gray-800 dark:text-gray-100">
			{#if isLogin}
				Welcome Back
			{:else}
				Join Travelyt
			{/if}
		</h1>
		<p class="text-center text-gray-600 dark:text-gray-300 mb-6">
			{#if isLogin}
				Plan your perfect trip
			{:else}
				Start planning your adventures
			{/if}
		</p>

		<form onsubmit={handleSubmit} novalidate>
			{#if error}
				<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
					{error}
				</div>
			{/if}

			{#if !isLogin}
				<div class="mb-4">
					<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="Your name"
						class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
			{/if}

			<div class="mb-4">
				<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="your@email.com"
					class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
					required
				/>
			</div>

			<div class="mb-4">
				<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
					required
				/>
			</div>

			{#if !isLogin}
				<div class="mb-6">
					<label for="confirm" class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
						>Confirm Password</label
					>
					<input
						type="password"
						id="confirm"
						bind:value={confirmPassword}
						placeholder="••••••••"
						class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
			{:else}
				<div class="mb-6"></div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition"
			>
				{loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
			</button>
		</form>

		<p class="text-center text-gray-600 dark:text-gray-300 mt-6">
			{#if isLogin}
				Don't have an account?
				<button onclick={toggleMode} class="text-blue-600 hover:underline font-semibold">
					Sign up
				</button>
			{:else}
				Already have an account?
				<button onclick={toggleMode} class="text-blue-600 hover:underline font-semibold">
					Sign in
				</button>
			{/if}
		</p>
	</div>
</div>

