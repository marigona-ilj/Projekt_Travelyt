<script>
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';

	export let tripId;

	let expenses = [];
	let total = 0;
	let loading = true;
	let error = '';
	let showNewExpenseForm = false;
	let newExpense = {
		description: '',
		amount: '',
		category: 'other',
		date: '',
		paidBy: ''
	};
	let formLoading = false;

	onMount(async () => {
		await fetchExpenses();
	});

	async function fetchExpenses() {
		try {
			const response = await fetch(`/api/trips/${tripId}/expenses`);
			const data = await response.json();
			if (data.success) {
				expenses = data.expenses;
				total = data.total;
			} else {
				error = data.error || 'Failed to load expenses';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	async function createExpense() {
		if (!newExpense.description || !newExpense.amount || !newExpense.date) {
			error = 'Please fill in all required fields';
			return;
		}

		formLoading = true;
		error = '';

		try {
			const response = await fetch(`/api/trips/${tripId}/expenses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(newExpense)
			});

			const data = await response.json();

			if (data.success) {
				newExpense = {
					description: '',
					amount: '',
					category: 'other',
					date: '',
					paidBy: ''
				};
				showNewExpenseForm = false;
				await fetchExpenses();
			} else {
				error = data.error || 'Failed to create expense';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			formLoading = false;
		}
	}

	async function deleteExpense(id) {
		if (confirm('Delete this expense?')) {
			try {
				const response = await fetch(`/api/trips/${tripId}/expenses/${id}`, {
					method: 'DELETE'
				});

				const data = await response.json();
				if (data.success) {
					await fetchExpenses();
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
		<div>
			<h2 class="text-2xl font-bold text-gray-800">Budget</h2>
			<p class="text-lg font-semibold text-blue-600">Total: {formatCurrency(total)}</p>
		</div>
		<button
			on:click={() => (showNewExpenseForm = !showNewExpenseForm)}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Expense
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">
			{error}
		</div>
	{/if}

	{#if showNewExpenseForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-4">
			<form on:submit|preventDefault={createExpense}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newExpense.description}
						placeholder="Description"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 mb-3">
					<input
						type="number"
						bind:value={newExpense.amount}
						placeholder="Amount"
						step="0.01"
						class="px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
					<input
						type="date"
						bind:value={newExpense.date}
						class="px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
				</div>
				<div class="flex gap-2 mb-3">
					<button
						type="submit"
						disabled={formLoading}
						class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
					>
						{formLoading ? 'Adding...' : 'Add'}
					</button>
					<button
						type="button"
						on:click={() => (showNewExpenseForm = false)}
						class="bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600">Loading expenses...</p>
	{:else if expenses.length === 0}
		<p class="text-gray-600">No expenses yet. Add one to track your budget!</p>
	{:else}
		<div class="space-y-2">
			{#each expenses as expense}
				<div class="bg-gray-50 rounded p-3 flex justify-between items-start">
					<div>
						<p class="font-semibold text-gray-800">{expense.description}</p>
						<p class="text-sm text-gray-600">
							{new Date(expense.date).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric'
							})}
						</p>
					</div>
					<div class="text-right">
						<p class="font-semibold text-gray-800">{formatCurrency(expense.amount)}</p>
						<button
							on:click={() => deleteExpense(expense.id)}
							class="text-red-600 hover:text-red-800 text-sm"
						>
							✕
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
