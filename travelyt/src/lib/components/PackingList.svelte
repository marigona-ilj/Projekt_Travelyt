<script>
	import { onMount } from 'svelte';
	import { Users, Lock, Pencil, Trash2 } from 'lucide-svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { tripId } = $props();

	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewItemForm = $state(false);
	let newItem = $state({ item: '', category: 'clothing', isPrivate: false });
	let formLoading = $state(false);
	let currentUserId = $state('');

	const categories = ['clothing', 'toiletries', 'documents', 'electronics', 'sports', 'other'];

	let sharedItems = $derived(items.filter((i) => !i.isPrivate));
	let privateItems = $derived(items.filter((i) => i.isPrivate));

	let groupedShared = $derived(
		sharedItems.reduce((acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		}, {})
	);

	let groupedPrivate = $derived(
		privateItems.reduce((acc, item) => {
			if (!acc[item.category]) acc[item.category] = [];
			acc[item.category].push(item);
			return acc;
		}, {})
	);

	let sharedPackedCount = $derived(sharedItems.filter((i) => i.packed).length);
	let privatePackedCount = $derived(privateItems.filter((i) => i.packed).length);

	onMount(async () => {
		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		currentUserId = authData.userId || '';
		await fetchItems();
	});

	async function fetchItems() {
		await flushPendingDelete();
		try {
			const response = await fetch(`/api/trips/${tripId}/packing`);
			const data = await response.json();
			if (data.success) {
				items = data.items;
			} else {
				error = data.error || 'Failed to load items';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	async function createItem(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!newItem.item || !newItem.category) {
			error = 'Please fill in all fields';
			return;
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch(`/api/trips/${tripId}/packing`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newItem)
			});

			const data = await response.json();

			if (data.success) {
				newItem = { item: '', category: 'clothing', isPrivate: false };
				showNewItemForm = false;
				await fetchItems();
			} else {
				error = data.error || 'Failed to add item';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			formLoading = false;
		}
	}

	async function togglePacked(id, packed) {
		try {
			const response = await fetch(`/api/trips/${tripId}/packing/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ packed: !packed })
			});

			const data = await response.json();
			if (data.success) {
				await fetchItems();
			} else {
				error = data.error || 'Failed to update';
			}
		} catch (err) {
			error = 'Network error';
		}
	}

	let editingId = $state(null);
	let editingValue = $state('');
	let editingCategory = $state('');

	let toastKey = $state(0);
	let toastVisible = $state(false);
	let toastMessage = $state('');
	let pendingDelete = $state(null);
	let deleteTimer = null;
	const UNDO_DURATION = 5000;

	async function flushPendingDelete() {
		if (!pendingDelete) return;
		clearTimeout(deleteTimer);
		const id = pendingDelete.id;
		pendingDelete = null;
		await fetch(`/api/trips/${tripId}/packing/${id}`, { method: 'DELETE' });
	}

	function startEdit(item) {
		editingId = item.id;
		editingValue = item.item;
		editingCategory = item.category;
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(id) {
		if (!editingValue.trim()) return;
		try {
			const response = await fetch(`/api/trips/${tripId}/packing/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ item: editingValue.trim(), category: editingCategory })
			});
			const data = await response.json();
			if (data.success) {
				editingId = null;
				await fetchItems();
			} else {
				error = data.error || 'Failed to update';
			}
		} catch (err) {
			error = 'Network error';
		}
	}

	function deleteItem(id) {
		flushPendingDelete();
		const index = items.findIndex((i) => i.id === id);
		if (index === -1) return;
		const data = items[index];
		pendingDelete = { id, data, index };
		items = items.filter((i) => i.id !== id);
		toastMessage = `"${data.item}" deleted`;
		toastVisible = true;
		toastKey++;
		deleteTimer = setTimeout(() => {
			toastVisible = false;
			fetch(`/api/trips/${tripId}/packing/${id}`, { method: 'DELETE' });
			pendingDelete = null;
		}, UNDO_DURATION);
	}

	function undoDeleteItem() {
		if (!pendingDelete) return;
		clearTimeout(deleteTimer);
		const restored = [...items];
		restored.splice(pendingDelete.index, 0, pendingDelete.data);
		items = restored;
		pendingDelete = null;
		toastVisible = false;
	}
</script>

{#key toastKey}
	<Toast message={toastMessage} visible={toastVisible} onUndo={undoDeleteItem} duration={UNDO_DURATION} />
{/key}

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Packing List</h2>
		<button
			onclick={() => (showNewItemForm = !showNewItemForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Item
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	{#if showNewItemForm}
		<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
			<form onsubmit={createItem}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newItem.item}
						placeholder="Item name"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
				<div class="mb-3">
					<select
						bind:value={newItem.category}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
					>
						{#each categories as cat}
							<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
						{/each}
					</select>
				</div>
				<div class="mb-3">
					<label class="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" bind:checked={newItem.isPrivate} class="w-4 h-4" />
						<span class="text-sm text-gray-700 dark:text-gray-200">
							<Lock size={14} /> Keep private — only visible to me
						</span>
					</label>
				</div>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1 px-3 rounded text-sm"
					>
						{formLoading ? 'Adding...' : 'Add'}
					</button>
					<button
						type="button"
						onclick={() => (showNewItemForm = false)}
						class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600 dark:text-gray-300">Loading items...</p>
	{:else}
		<!-- Shared packing list -->
		<div class="mb-8">
			<div class="flex items-center gap-2 mb-3">
				<Users size={20} class="text-gray-600 dark:text-gray-300" />
				<h3 class="text-lg font-bold text-gray-700 dark:text-gray-200">Shared List</h3>
				<span class="text-sm text-gray-400 dark:text-gray-500 ml-auto">{sharedPackedCount} of {sharedItems.length} packed</span>
			</div>

			{#if sharedItems.length === 0}
				<p class="text-gray-400 dark:text-gray-500 text-sm pl-1">No shared items yet.</p>
			{:else}
				<div class="space-y-4">
					{#each Object.entries(groupedShared) as [category, categoryItems]}
						<div>
							<h4 class="font-semibold text-gray-600 dark:text-gray-300 capitalize text-sm mb-1">{category}</h4>
							<div class="space-y-1">
								{#each categoryItems as item}
									<div class="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded p-2">
										<input
											type="checkbox"
											checked={item.packed}
											onchange={() => togglePacked(item.id, item.packed)}
											class="w-4 h-4 cursor-pointer"
										/>
										{#if editingId === item.id}
											<input
												type="text"
												bind:value={editingValue}
												onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
												class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
											/>
											<select bind:value={editingCategory} class="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-gray-100">
												{#each categories as cat}
													<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
												{/each}
											</select>
											<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
											<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
										{:else}
											<span class={item.packed ? 'line-through text-gray-400 flex-1' : 'text-gray-800 dark:text-gray-100 flex-1'}>
												{item.item}
											</span>
											<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
											<button onclick={() => deleteItem(item.id)} class="text-gray-400 hover:text-gray-600"><Trash2 size={14} /></button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Private packing list -->
		<div class="border-t border-gray-200 dark:border-gray-700 pt-6">
			<div class="flex items-center gap-2 mb-3">
				<Lock size={20} class="text-gray-600 dark:text-gray-300" />
				<h3 class="text-lg font-bold text-gray-700 dark:text-gray-200">My Private List</h3>
				<span class="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full ml-1">Only visible to you</span>
				<span class="text-sm text-gray-400 dark:text-gray-500 ml-auto">{privatePackedCount} of {privateItems.length} packed</span>
			</div>

			{#if privateItems.length === 0}
				<p class="text-gray-400 dark:text-gray-500 text-sm pl-1">No private items yet. Add items with "Keep private" checked.</p>
			{:else}
				<div class="space-y-4">
					{#each Object.entries(groupedPrivate) as [category, categoryItems]}
						<div>
							<h4 class="font-semibold text-gray-600 dark:text-gray-300 capitalize text-sm mb-1">{category}</h4>
							<div class="space-y-1">
								{#each categoryItems as item}
									<div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded p-2">
										<input
											type="checkbox"
											checked={item.packed}
											onchange={() => togglePacked(item.id, item.packed)}
											class="w-4 h-4 cursor-pointer"
										/>
										{#if editingId === item.id}
											<input
												type="text"
												bind:value={editingValue}
												onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
												class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
											/>
											<select bind:value={editingCategory} class="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-xs dark:bg-gray-700 dark:text-gray-100">
												{#each categories as cat}
													<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
												{/each}
											</select>
											<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
											<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
										{:else}
											<span class={item.packed ? 'line-through text-gray-400 flex-1' : 'text-gray-800 dark:text-gray-100 flex-1'}>
												{item.item}
											</span>
											<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
											<button onclick={() => deleteItem(item.id)} class="text-gray-400 hover:text-gray-600"><Trash2 size={14} /></button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	:global(.line-through) {
		text-decoration: line-through;
	}
</style>
