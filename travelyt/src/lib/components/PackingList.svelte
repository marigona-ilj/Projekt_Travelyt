<script>
	import { onMount } from 'svelte';
	import { Users, Lock } from 'lucide-svelte';

	let { tripId, currentUserId } = $props();

	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewItemForm = $state(false);
	let newItem = $state({ item: '', category: 'clothing', isPrivate: false });
	let formLoading = $state(false);

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
		await fetchItems();
	});

	async function fetchItems() {
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

	async function deleteItem(id) {
		if (confirm('Delete this item?')) {
			try {
				const response = await fetch(`/api/trips/${tripId}/packing/${id}`, {
					method: 'DELETE'
				});

				const data = await response.json();
				if (data.success) {
					await fetchItems();
				} else {
					error = data.error || 'Failed to delete';
				}
			} catch (err) {
				error = 'Network error';
			}
		}
	}
</script>

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800">Packing List</h2>
		<button
			onclick={() => (showNewItemForm = !showNewItemForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Item
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	{#if showNewItemForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
			<form onsubmit={createItem}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newItem.item}
						placeholder="Item name"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
				</div>
				<div class="mb-3">
					<select
						bind:value={newItem.category}
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
					>
						{#each categories as cat}
							<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
						{/each}
					</select>
				</div>
				<div class="mb-3">
					<label class="flex items-center gap-2 cursor-pointer select-none">
						<input type="checkbox" bind:checked={newItem.isPrivate} class="w-4 h-4" />
						<span class="text-sm text-gray-700">
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
						class="bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600">Loading items...</p>
	{:else}
		<!-- Shared packing list -->
		<div class="mb-8">
			<div class="flex items-center gap-2 mb-3">
				<Users size={20} class="text-gray-600" />
				<h3 class="text-lg font-bold text-gray-700">Shared List</h3>
				<span class="text-sm text-gray-400 ml-auto">{sharedPackedCount} of {sharedItems.length} packed</span>
			</div>

			{#if sharedItems.length === 0}
				<p class="text-gray-400 text-sm pl-1">No shared items yet.</p>
			{:else}
				<div class="space-y-4">
					{#each Object.entries(groupedShared) as [category, categoryItems]}
						<div>
							<h4 class="font-semibold text-gray-600 capitalize text-sm mb-1">{category}</h4>
							<div class="space-y-1">
								{#each categoryItems as item}
									<div class="flex items-center gap-2 bg-gray-50 rounded p-2">
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
												class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm"
											/>
											<select bind:value={editingCategory} class="px-1 py-0.5 border border-gray-300 rounded text-xs">
												{#each categories as cat}
													<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
												{/each}
											</select>
											<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
											<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
										{:else}
											<span class={item.packed ? 'line-through text-gray-400 flex-1' : 'text-gray-800 flex-1'}>
												{item.item}
											</span>
											{#if item.createdBy === currentUserId || !item.createdBy}
												<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500 text-sm">✏</button>
												<button onclick={() => deleteItem(item.id)} class="text-red-400 hover:text-red-600 text-sm">✕</button>
											{/if}
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
		<div class="border-t border-gray-200 pt-6">
			<div class="flex items-center gap-2 mb-3">
				<Lock size={20} class="text-gray-600" />
				<h3 class="text-lg font-bold text-gray-700">My Private List</h3>
				<span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full ml-1">Only visible to you</span>
				<span class="text-sm text-gray-400 ml-auto">{privatePackedCount} of {privateItems.length} packed</span>
			</div>

			{#if privateItems.length === 0}
				<p class="text-gray-400 text-sm pl-1">No private items yet. Add items with "Keep private" checked.</p>
			{:else}
				<div class="space-y-4">
					{#each Object.entries(groupedPrivate) as [category, categoryItems]}
						<div>
							<h4 class="font-semibold text-gray-600 capitalize text-sm mb-1">{category}</h4>
							<div class="space-y-1">
								{#each categoryItems as item}
									<div class="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded p-2">
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
												class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm"
											/>
											<select bind:value={editingCategory} class="px-1 py-0.5 border border-gray-300 rounded text-xs">
												{#each categories as cat}
													<option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
												{/each}
											</select>
											<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
											<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
										{:else}
											<span class={item.packed ? 'line-through text-gray-400 flex-1' : 'text-gray-800 flex-1'}>
												{item.item}
											</span>
											<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500 text-sm">✏</button>
											<button onclick={() => deleteItem(item.id)} class="text-red-400 hover:text-red-600 text-sm">✕</button>
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
