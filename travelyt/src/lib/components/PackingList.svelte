<script>
	import { onMount } from 'svelte';

	let { tripId } = $props();

	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let showNewItemForm = $state(false);
	let newItem = $state({
		item: '',
		category: 'clothing'
	});
	let formLoading = $state(false);

	const categories = ['clothing', 'toiletries', 'documents', 'electronics', 'sports', 'other'];

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
				newItem = { item: '', category: 'clothing' };
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

	let packedCount = $derived(items.filter((i) => i.packed).length);
	let grouped = $derived(items.reduce((acc, item) => {
		if (!acc[item.category]) acc[item.category] = [];
		acc[item.category].push(item);
		return acc;
	}, {}));
</script>

<div>
	<div class="flex justify-between items-center mb-4">
		<div>
			<h2 class="text-2xl font-bold text-gray-800">Packing List</h2>
			<p class="text-sm text-gray-600">{packedCount} of {items.length} packed</p>
		</div>
		<button
			onclick={() => (showNewItemForm = !showNewItemForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Item
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if showNewItemForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-4">
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
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
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
	{:else if items.length === 0}
		<p class="text-gray-600">No items yet. Start packing!</p>
	{:else}
		<div class="space-y-4">
			{#each Object.entries(grouped) as [category, categoryItems]}
				<div>
					<h3 class="font-semibold text-gray-700 capitalize mb-2">{category}</h3>
					<div class="space-y-1">
						{#each categoryItems as item}
							<div class="flex items-center gap-2 bg-gray-50 rounded p-2">
								<input
									type="checkbox"
									checked={item.packed}
									onchange={() => togglePacked(item.id, item.packed)}
									class="w-4 h-4 cursor-pointer"
								/>
								<span class={item.packed ? 'line-through text-gray-500' : 'text-gray-800'}>
									{item.item}
								</span>
								<button
									onclick={() => deleteItem(item.id)}
									class="ml-auto text-red-600 hover:text-red-800 text-sm"
								>
									✕
								</button>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(.line-through) {
		text-decoration: line-through;
	}
</style>
