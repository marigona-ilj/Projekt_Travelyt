<script>
	import { onMount } from 'svelte';
	import { UserCheck, Users, Pencil, Trash2 } from 'lucide-svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { tripId } = $props();

	const groupSuggestions = [
		'Flight booked',
		'Accommodation reserved',
		'Airport transfer booked',
		'Car rental booked',
		'Travel itinerary shared with group',
		'Restaurant reservations made',
		'Activities & tours booked',
		'Emergency contacts noted',
		'Offline maps downloaded',
		'Group chat created'
	];

	const personalSuggestions = [
		'Passport valid',
		'Travel insurance arranged',
		'Visa obtained (if required)',
		'Vaccinations up to date',
		'Driver\'s license valid',
		'Local currency withdrawn',
		'Bank notified of travel',
		'Phone roaming enabled',
		'Copies of documents made',
		'Online check-in completed',
		'Seat selection done',
		'Home secured / neighbor informed',
		'Pet care arranged'
	];

	let items = $state([]);
	let loading = $state(true);
	let error = $state('');
	let newText = $state('');
	let newIsPersonal = $state(false);
	let adding = $state(false);
	let showForm = $state(false);
	let editingId = $state(null);
	let editingText = $state('');

	let toastKey = $state(0);
	let toastVisible = $state(false);
	let toastMessage = $state('');
	let pendingDelete = $state(null);
	let deleteTimer = null;
	const UNDO_DURATION = 5000;

	let groupItems = $derived(items.filter((i) => !i.isPersonal));
	let personalItems = $derived(items.filter((i) => i.isPersonal));

	let groupDone = $derived(groupItems.filter((i) => i.checked).length);
	let personalDone = $derived(personalItems.filter((i) => i.checked).length);
	let totalDone = $derived(groupDone + personalDone);
	let pct = $derived(items.length === 0 ? 0 : Math.round((totalDone / items.length) * 100));

	onMount(async () => {
		await fetchItems();
	});

	async function fetchItems() {
		await flushPendingDelete();
		try {
			const res = await fetch(`/api/trips/${tripId}/checklist`);
			const data = await res.json();
			if (data.success) items = data.items;
			else error = data.error || 'Failed to load checklist';
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	async function addItem(text, isPersonal = false) {
		if (!text?.trim()) return;
		adding = true;
		try {
			const res = await fetch(`/api/trips/${tripId}/checklist`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, isPersonal })
			});
			const data = await res.json();
			if (data.success) {
				newText = '';
				newIsPersonal = false;
				showForm = false;
				await fetchItems();
			} else {
				error = data.error || 'Failed to add item';
			}
		} catch {
			error = 'Network error';
		} finally {
			adding = false;
		}
	}

	async function toggleItem(item) {
		items = items.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i);
		try {
			await fetch(`/api/trips/${tripId}/checklist/${item.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ checked: !item.checked })
			});
		} catch {
			await fetchItems();
		}
	}

	async function flushPendingDelete() {
		if (!pendingDelete) return;
		clearTimeout(deleteTimer);
		const id = pendingDelete.id;
		pendingDelete = null;
		await fetch(`/api/trips/${tripId}/checklist/${id}`, { method: 'DELETE' });
	}

	function deleteItem(id) {
		flushPendingDelete();
		const index = items.findIndex((i) => i.id === id);
		if (index === -1) return;
		const data = items[index];
		pendingDelete = { id, data, index };
		items = items.filter((i) => i.id !== id);
		toastMessage = `"${data.text}" deleted`;
		toastVisible = true;
		toastKey++;
		deleteTimer = setTimeout(() => {
			toastVisible = false;
			fetch(`/api/trips/${tripId}/checklist/${id}`, { method: 'DELETE' });
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

	function startEdit(item) {
		editingId = item.id;
		editingText = item.text;
	}

	function cancelEdit() {
		editingId = null;
		editingText = '';
	}

	async function saveEdit(id) {
		if (!editingText.trim()) return;
		try {
			const res = await fetch(`/api/trips/${tripId}/checklist/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: editingText })
			});
			const data = await res.json();
			if (data.success) {
				items = items.map((i) => i.id === id ? { ...i, text: editingText.trim() } : i);
				editingId = null;
				editingText = '';
			} else {
				error = data.error || 'Failed to save';
			}
		} catch {
			error = 'Network error';
		}
	}

	function handleSubmit(event) {
		if (event?.preventDefault) event.preventDefault();
		addItem(newText, newIsPersonal);
	}

	let unusedGroupSuggestions = $derived(
		groupSuggestions.filter((s) => !items.some((i) => i.text.toLowerCase() === s.toLowerCase()))
	);
	let unusedPersonalSuggestions = $derived(
		personalSuggestions.filter((s) => !items.some((i) => i.text.toLowerCase() === s.toLowerCase()))
	);
</script>

{#key toastKey}
	<Toast message={toastMessage} visible={toastVisible} onUndo={undoDeleteItem} duration={UNDO_DURATION} />
{/key}

<div>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Pre-Trip Checklist</h2>
		<button
			onclick={() => (showForm = !showForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Item
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	{#if items.length > 0}
		<div class="mb-5">
			<div class="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
				<span>{totalDone} of {items.length} done</span>
				<span>{pct}%</span>
			</div>
			<div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
				<div
					class="h-2 rounded-full transition-all duration-300 {pct === 100 ? 'bg-green-500' : 'bg-blue-500'}"
					style="width: {pct}%"
				></div>
			</div>
		</div>
	{/if}

	{#if showForm}
		<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-5 border border-gray-200 dark:border-gray-700">
			<form onsubmit={handleSubmit}>
				<div class="flex gap-2 mb-3">
					<input
						type="text"
						bind:value={newText}
						placeholder="e.g. Book airport transfer"
						class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
				<label class="flex items-center gap-2 cursor-pointer select-none mb-3">
					<input type="checkbox" bind:checked={newIsPersonal} class="w-4 h-4" />
					<span class="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-1">
						<UserCheck size={13} /> Individual — everyone checks this for themselves
					</span>
				</label>
				<div class="flex gap-2">
					<button
						type="submit"
						disabled={adding}
						class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1 px-3 rounded text-sm"
					>
						{adding ? '...' : 'Add'}
					</button>
					<button
						type="button"
						onclick={() => { showForm = false; newText = ''; newIsPersonal = false; }}
						class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600 dark:text-gray-300">Loading checklist...</p>
	{:else}
		<!-- Group items -->
		{#if groupItems.length > 0}
			<div class="mb-6">
				<div class="flex items-center gap-2 mb-2">
					<Users size={16} class="text-gray-500 dark:text-gray-400" />
					<h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Group Tasks</h3>
					<span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">{groupDone}/{groupItems.length}</span>
				</div>
				<ul class="space-y-1">
					{#each groupItems as item (item.id)}
						<li class="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2.5">
							{#if editingId === item.id}
								<input
									type="text"
									bind:value={editingText}
									onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
									class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
								/>
								<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
								<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
							{:else}
								<input
									type="checkbox"
									checked={item.checked}
									onchange={() => toggleItem(item)}
									class="w-4 h-4 cursor-pointer accent-blue-600"
								/>
								<span class="flex-1 text-sm {item.checked ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}">
									{item.text}
								</span>
								<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
								<button onclick={() => deleteItem(item.id)} class="text-gray-400 hover:text-gray-600"><Trash2 size={14} /></button>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Personal items -->
		{#if personalItems.length > 0}
			<div class="mb-6">
				<div class="flex items-center gap-2 mb-2">
					<UserCheck size={16} class="text-gray-500 dark:text-gray-400" />
					<h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Individual Tasks</h3>
					<span class="text-xs text-gray-400 dark:text-gray-500 ml-1">(each person checks for themselves)</span>
					<span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">{personalDone}/{personalItems.length}</span>
				</div>
				<ul class="space-y-1">
					{#each personalItems as item (item.id)}
						<li class="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5">
							{#if editingId === item.id}
								<input
									type="text"
									bind:value={editingText}
									onkeydown={(e) => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
									class="flex-1 px-2 py-0.5 border border-blue-400 rounded text-sm"
								/>
								<button onclick={() => saveEdit(item.id)} class="text-green-600 hover:text-green-800 text-sm font-bold">✓</button>
								<button onclick={cancelEdit} class="text-gray-400 hover:text-gray-600 text-sm">✕</button>
							{:else}
								<input
									type="checkbox"
									checked={item.checked}
									onchange={() => toggleItem(item)}
									class="w-4 h-4 cursor-pointer accent-indigo-500"
								/>
								<span class="flex-1 text-sm {item.checked ? 'line-through text-gray-400' : 'text-gray-800'}">
									{item.text}
								</span>
								<button onclick={() => startEdit(item)} class="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
								<button onclick={() => deleteItem(item.id)} class="text-gray-400 hover:text-gray-600"><Trash2 size={14} /></button>
							{/if}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if items.length === 0 && !showForm}
			<p class="text-center text-gray-500 dark:text-gray-400 text-sm py-4">No items yet. Add your own or pick from suggestions below.</p>
		{/if}
	{/if}

	<!-- Suggestions -->
	{#if unusedGroupSuggestions.length > 0 || unusedPersonalSuggestions.length > 0}
		<div class="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
			{#if unusedGroupSuggestions.length > 0}
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><Users size={12} /> Group suggestions:</p>
					<div class="flex flex-wrap gap-2">
						{#each unusedGroupSuggestions as s}
							<button
								onclick={() => addItem(s, false)}
								class="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600 transition"
							>
								+ {s}
							</button>
						{/each}
					</div>
				</div>
			{/if}
			{#if unusedPersonalSuggestions.length > 0}
				<div>
					<p class="text-xs text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1"><UserCheck size={12} /> Individual suggestions:</p>
					<div class="flex flex-wrap gap-2">
						{#each unusedPersonalSuggestions as s}
							<button
								onclick={() => addItem(s, true)}
								class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 transition"
							>
								+ {s}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
