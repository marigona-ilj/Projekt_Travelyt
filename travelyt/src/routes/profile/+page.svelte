<script>
	import Header from '$lib/components/Header.svelte';
	import { onMount } from 'svelte';
	import { Camera, Pencil, Check, X, KeyRound, Trash2, AlertTriangle, LogOut } from 'lucide-svelte';

	let user = $state(null);
	let loading = $state(true);

	// Name editing
	let editingName = $state(false);
	let nameInput = $state('');
	let nameSaving = $state(false);
	let nameError = $state('');
	let nameSuccess = $state(false);

	// Avatar
	let avatarUploading = $state(false);
	let avatarInput;

	// Password
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordSaving = $state(false);
	let passwordError = $state('');
	let passwordSuccess = $state(false);

	// Delete account modal
	let showDeleteModal = $state(false);
	let deletePassword = $state('');
	let deleteError = $state('');
	let deleteLoading = $state(false);

	const AVATAR_COLORS = [
		'bg-blue-500', 'bg-violet-500', 'bg-pink-500', 'bg-teal-500',
		'bg-orange-500', 'bg-indigo-500', 'bg-rose-500', 'bg-cyan-600'
	];
	function avatarColor(id) {
		return AVATAR_COLORS[id.charCodeAt(id.length - 1) % AVATAR_COLORS.length];
	}
	function initials(name) {
		return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
	}

	onMount(async () => {
		const res = await fetch('/api/auth');
		const data = await res.json();
		if (data.authenticated) {
			user = data.user;
			nameInput = data.user.name;
		}
		loading = false;
	});

	function startEditName() {
		nameInput = user.name;
		nameError = '';
		nameSuccess = false;
		editingName = true;
	}

	function cancelEditName() {
		editingName = false;
		nameError = '';
	}

	async function saveName() {
		if (!nameInput.trim()) {
			nameError = 'Name cannot be empty';
			return;
		}
		nameSaving = true;
		nameError = '';
		try {
			const res = await fetch('/api/user', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: nameInput.trim() })
			});
			const data = await res.json();
			if (data.success) {
				user = { ...user, name: nameInput.trim() };
				editingName = false;
				nameSuccess = true;
				setTimeout(() => (nameSuccess = false), 3000);
			} else {
				nameError = data.error || 'Failed to update name';
			}
		} catch {
			nameError = 'Network error';
		} finally {
			nameSaving = false;
		}
	}

	function resizeImage(file) {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = (e) => {
				const img = new Image();
				img.onload = () => {
					const size = 200;
					const canvas = document.createElement('canvas');
					canvas.width = size;
					canvas.height = size;
					const ctx = canvas.getContext('2d');
					const side = Math.min(img.width, img.height);
					const ox = (img.width - side) / 2;
					const oy = (img.height - side) / 2;
					ctx.drawImage(img, ox, oy, side, side, 0, 0, size, size);
					resolve(canvas.toDataURL('image/jpeg', 0.82));
				};
				img.src = e.target.result;
			};
			reader.readAsDataURL(file);
		});
	}

	async function handleAvatarChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		avatarUploading = true;
		try {
			const dataUrl = await resizeImage(file);
			const res = await fetch('/api/user', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ avatar: dataUrl })
			});
			const data = await res.json();
			if (data.success) {
				user = { ...user, avatar: dataUrl };
			}
		} catch {
			// silently ignore
		} finally {
			avatarUploading = false;
			event.target.value = '';
		}
	}

	async function changePassword(event) {
		event.preventDefault();
		passwordError = '';
		passwordSuccess = false;

		if (!currentPassword || !newPassword || !confirmPassword) {
			passwordError = 'All fields are required';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'New passwords do not match';
			return;
		}
		if (newPassword.length < 8) {
			passwordError = 'New password must be at least 8 characters';
			return;
		}

		passwordSaving = true;
		try {
			const res = await fetch('/api/user/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
			});
			const data = await res.json();
			if (data.success) {
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
				passwordSuccess = true;
				setTimeout(() => (passwordSuccess = false), 4000);
			} else {
				passwordError = data.error || 'Failed to change password';
			}
		} catch {
			passwordError = 'Network error';
		} finally {
			passwordSaving = false;
		}
	}

	function logout() {
		document.cookie = 'userId=; Max-Age=0; Path=/;';
		window.location.href = '/auth';
	}

	async function deleteAccount() {
		deleteError = '';
		if (!deletePassword) {
			deleteError = 'Please enter your password';
			return;
		}
		deleteLoading = true;
		try {
			const res = await fetch('/api/user', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: deletePassword })
			});
			const data = await res.json();
			if (data.success) {
				window.location.href = '/auth';
			} else {
				deleteError = data.error || 'Failed to delete account';
			}
		} catch {
			deleteError = 'Network error';
		} finally {
			deleteLoading = false;
		}
	}
</script>

<Header />

<div class="bg-gray-50 dark:bg-gray-900 min-h-screen">
<main class="max-w-2xl mx-auto px-4 py-8">
	<h1 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">Profile</h1>
	<p class="text-gray-500 dark:text-gray-400 mb-8 text-sm">Manage your account</p>

	{#if loading}
		<div class="flex justify-center py-16">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if user}
		<!-- Avatar & Name -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
			<div class="flex items-center gap-5">
				<!-- Avatar -->
				<div class="relative shrink-0">
					<button
						onclick={() => avatarInput.click()}
						disabled={avatarUploading}
						class="group relative w-20 h-20 rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
						title="Change photo"
					>
						{#if user.avatar}
							<img src={user.avatar} alt="Avatar" class="w-full h-full object-cover" />
						{:else}
							<div class="w-full h-full {avatarColor(user.id)} flex items-center justify-center text-white text-2xl font-bold">
								{initials(user.name)}
							</div>
						{/if}
						<div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
							{#if avatarUploading}
								<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							{:else}
								<Camera size={20} class="text-white" />
							{/if}
						</div>
					</button>
					<input
						bind:this={avatarInput}
						type="file"
						accept="image/*"
						class="hidden"
						onchange={handleAvatarChange}
					/>
				</div>

				<!-- Name + email -->
				<div class="flex-1 min-w-0">
					{#if editingName}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={nameInput}
								onkeydown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEditName(); }}
								class="flex-1 text-xl font-bold px-2 py-1 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
								autofocus
							/>
							<button
								onclick={saveName}
								disabled={nameSaving}
								class="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
							>
								<Check size={16} />
							</button>
							<button
								onclick={cancelEditName}
								class="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
							>
								<X size={16} />
							</button>
						</div>
						{#if nameError}
							<p class="text-red-500 text-xs mt-1">{nameError}</p>
						{/if}
					{:else}
						<div class="flex items-center gap-2 group">
							<span class="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">{user.name}</span>
							<button
								onclick={startEditName}
								class="p-1 rounded text-gray-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
								title="Edit name"
							>
								<Pencil size={14} />
							</button>
						</div>
						{#if nameSuccess}
							<p class="text-green-500 text-xs mt-0.5">Name updated</p>
						{/if}
					{/if}
					<p class="text-gray-500 dark:text-gray-400 text-sm mt-0.5 truncate">{user.email}</p>
					<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Click your photo to change it</p>
				</div>
			</div>
		</div>

		<!-- Change Password -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
			<div class="flex items-center gap-2 mb-5">
				<KeyRound size={18} class="text-gray-500 dark:text-gray-400" />
				<h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">Change Password</h2>
			</div>
			<form onsubmit={changePassword} novalidate class="space-y-3">
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Current password</label>
					<input
						type="password"
						bind:value={currentPassword}
						placeholder="••••••••"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">New password</label>
					<input
						type="password"
						bind:value={newPassword}
						placeholder="At least 8 characters"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Confirm new password</label>
					<input
						type="password"
						bind:value={confirmPassword}
						placeholder="••••••••"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm dark:bg-gray-700 dark:text-gray-100"
					/>
				</div>
				{#if passwordError}
					<p class="text-red-500 text-sm">{passwordError}</p>
				{/if}
				{#if passwordSuccess}
					<p class="text-green-500 text-sm">Password changed successfully.</p>
				{/if}
				<button
					type="submit"
					disabled={passwordSaving}
					class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-lg text-sm transition"
				>
					{passwordSaving ? 'Saving...' : 'Update password'}
				</button>
			</form>
		</div>

		<!-- Logout -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-semibold text-gray-800 dark:text-gray-100">Sign out</p>
					<p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">You will be redirected to the login page.</p>
				</div>
				<button
					onclick={logout}
					class="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition"
				>
					<LogOut size={15} /> Sign out
				</button>
			</div>
		</div>

		<!-- Danger Zone -->
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/40 p-6">
			<div class="flex items-center gap-2 mb-3">
				<AlertTriangle size={18} class="text-red-500" />
				<h2 class="text-base font-semibold text-red-600 dark:text-red-400">Danger Zone</h2>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				Permanently delete your account and all associated data. This cannot be undone.
			</p>
			<button
				onclick={() => { showDeleteModal = true; deletePassword = ''; deleteError = ''; }}
				class="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold py-2 px-4 rounded-lg text-sm transition"
			>
				<Trash2 size={15} /> Delete account
			</button>
		</div>
	{/if}
</main>
</div>

<!-- Delete account modal -->
{#if showDeleteModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
		role="dialog"
		aria-modal="true"
	>
		<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
			<div class="flex items-center gap-2 mb-4">
				<AlertTriangle size={20} class="text-red-500" />
				<h3 class="text-lg font-bold text-gray-800 dark:text-gray-100">Delete account</h3>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
				This will permanently delete your account and remove you from all trips. Enter your password to confirm.
			</p>
			<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
			<input
				type="password"
				bind:value={deletePassword}
				placeholder="••••••••"
				onkeydown={(e) => { if (e.key === 'Enter') deleteAccount(); }}
				class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 text-sm dark:bg-gray-700 dark:text-gray-100 mb-3"
			/>
			{#if deleteError}
				<p class="text-red-500 text-sm mb-3">{deleteError}</p>
			{/if}
			<div class="flex gap-2">
				<button
					onclick={deleteAccount}
					disabled={deleteLoading}
					class="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-2 rounded-xl text-sm transition"
				>
					{deleteLoading ? 'Deleting...' : 'Delete my account'}
				</button>
				<button
					onclick={() => (showDeleteModal = false)}
					class="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2 rounded-xl text-sm transition"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
