<script>

let email = $state('');
let password = $state('');
let name = $state('');
let confirmPassword = $state('');
let isLogin = $state(true);
let loading = $state(false);
let error = $state('');
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
				window.location.href = '/trips';
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

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
	<div class="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
		<h1 class="text-3xl font-bold text-center mb-2 text-gray-800">
			{#if isLogin}
				Welcome Back
			{:else}
				Join Travelyt
			{/if}
		</h1>
		<p class="text-center text-gray-600 mb-6">
			{#if isLogin}
				Plan your perfect trip
			{:else}
				Start planning your adventures
			{/if}
		</p>

		<form onsubmit={handleSubmit}>
			{#if error}
				<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			{/if}

			{#if !isLogin}
				<div class="mb-4">
					<label for="name" class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="Your name"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
					/>
				</div>
			{/if}

			<div class="mb-4">
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					placeholder="your@email.com"
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					required
				/>
			</div>

			<div class="mb-4">
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
				<input
					type="password"
					id="password"
					bind:value={password}
					placeholder="••••••••"
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					required
				/>
			</div>

			{#if !isLogin}
				<div class="mb-6">
					<label for="confirm" class="block text-sm font-medium text-gray-700 mb-1"
						>Confirm Password</label
					>
					<input
						type="password"
						id="confirm"
						bind:value={confirmPassword}
						placeholder="••••••••"
						class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

		<p class="text-center text-gray-600 mt-6">
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

<style>
	:global(body) {
		background-color: #f5f5f5;
	}
</style>
