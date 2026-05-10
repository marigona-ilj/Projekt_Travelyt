<script>
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';

	let { tripId, currentUserId, currency = 'CHF' } = $props();

	let expenses = $state([]);
	let members = $state([]);
	let total = $state(0);
	let loading = $state(true);
	let error = $state('');
	let showNewExpenseForm = $state(false);
	let newExpense = $state({ description: '', amount: '', date: '', paidBy: '' });
	let formLoading = $state(false);

	const fmt = (n) => formatCurrency(n, currency);

	let memberMap = $derived(
		Object.fromEntries(members.map((m) => [m.userId, m.name]))
	);

	let settlement = $derived(calculateSettlement(expenses, members));

	function calculateSettlement(exps, mbrs) {
		if (mbrs.length <= 1 || exps.length === 0) return null;

		const tot = exps.reduce((sum, e) => sum + e.amount, 0);
		const fairShare = tot / mbrs.length;

		const paid = Object.fromEntries(mbrs.map((m) => [m.userId, 0]));
		exps.forEach((e) => {
			if (paid[e.paidBy] !== undefined) paid[e.paidBy] += e.amount;
		});

		const balances = mbrs.map((m) => ({
			userId: m.userId,
			name: m.name,
			paid: paid[m.userId] || 0,
			balance: Math.round(((paid[m.userId] || 0) - fairShare) * 100) / 100
		}));

		// Greedy settlement: match biggest creditor with biggest debtor
		const creditors = balances
			.filter((b) => b.balance > 0.01)
			.map((b) => ({ ...b, remaining: b.balance }))
			.sort((a, b) => b.remaining - a.remaining);
		const debtors = balances
			.filter((b) => b.balance < -0.01)
			.map((b) => ({ ...b, remaining: -b.balance }))
			.sort((a, b) => b.remaining - a.remaining);

		const settlements = [];
		let ci = 0,
			di = 0;
		while (ci < creditors.length && di < debtors.length) {
			const amount = Math.min(creditors[ci].remaining, debtors[di].remaining);
			if (amount > 0.01) {
				settlements.push({
					from: debtors[di].name,
					to: creditors[ci].name,
					amount: Math.round(amount * 100) / 100
				});
			}
			creditors[ci].remaining -= amount;
			debtors[di].remaining -= amount;
			if (creditors[ci].remaining < 0.01) ci++;
			if (debtors[di].remaining < 0.01) di++;
		}

		return { balances, settlements, fairShare, total: tot };
	}

	onMount(async () => {
		await Promise.all([fetchExpenses(), fetchMembers()]);
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

	async function fetchMembers() {
		try {
			const response = await fetch(`/api/trips/${tripId}/members`);
			const data = await response.json();
			if (data.success) {
				members = data.members;
				if (!newExpense.paidBy) newExpense.paidBy = currentUserId;
			}
		} catch (err) {
			// silently ignore, settlement just won't show
		}
	}

	function openForm() {
		newExpense = { description: '', amount: '', date: '', paidBy: currentUserId };
		showNewExpenseForm = true;
	}

	async function createExpense(event) {
		if (event?.preventDefault) event.preventDefault();
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
				body: JSON.stringify({ ...newExpense, paidBy: newExpense.paidBy || currentUserId })
			});

			const data = await response.json();

			if (data.success) {
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
	<!-- Header -->
	<div class="flex justify-between items-center mb-6">
		<div>
			<h2 class="text-2xl font-bold text-gray-800">Budget</h2>
			<p class="text-lg font-semibold text-blue-600">Total: {fmt(total)}</p>
		</div>
		<button
			onclick={openForm}
			class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
		>
			+ Add Expense
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	<!-- Add expense form -->
	{#if showNewExpenseForm}
		<div class="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
			<form onsubmit={createExpense}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newExpense.description}
						placeholder="What was this for? (e.g. Hotel)"
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						required
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 mb-3">
					<input
						type="number"
						bind:value={newExpense.amount}
						placeholder="Amount ({currency})"
						step="0.01"
						min="0"
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
				{#if members.length > 1}
					<div class="mb-3">
						<label class="block text-xs text-gray-500 mb-1">Paid by</label>
						<select
							bind:value={newExpense.paidBy}
							class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						>
							{#each members as member}
								<option value={member.userId}>
									{member.name}{member.userId === currentUserId ? ' (you)' : ''}
								</option>
							{/each}
						</select>
					</div>
				{/if}
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
						onclick={() => (showNewExpenseForm = false)}
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
		<p class="text-gray-500 text-sm">No expenses yet. Add one to start tracking!</p>
	{:else}
		<!-- Expense list -->
		<div class="space-y-2 mb-8">
			{#each expenses as expense}
				<div class="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
					<div>
						<p class="font-semibold text-gray-800">{expense.description}</p>
						<p class="text-xs text-gray-500">
							{new Date(expense.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
							· paid by <span class="font-medium text-gray-700">
								{memberMap[expense.paidBy] ?? 'Unknown'}
								{expense.paidBy === currentUserId ? ' (you)' : ''}
							</span>
						</p>
					</div>
					<div class="flex items-center gap-3">
						<span class="font-semibold text-gray-800">{fmt(expense.amount)}</span>
						<button onclick={() => deleteExpense(expense.id)} class="text-red-400 hover:text-red-600 text-sm">✕</button>
					</div>
				</div>
			{/each}
		</div>

		<!-- Group settlement (only for group trips) -->
		{#if settlement}
			<div class="border-t border-gray-200 pt-6">
				<!-- Who paid what -->
				<h3 class="text-lg font-bold text-gray-700 mb-3">💰 Who paid what</h3>
				<div class="bg-gray-50 rounded-lg overflow-hidden mb-6">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-600 text-xs uppercase">
								<th class="text-left px-4 py-2">Member</th>
								<th class="text-right px-4 py-2">Paid</th>
								<th class="text-right px-4 py-2">Fair share</th>
								<th class="text-right px-4 py-2">Balance</th>
							</tr>
						</thead>
						<tbody>
							{#each settlement.balances as row}
								<tr class="border-t border-gray-200">
									<td class="px-4 py-2 font-medium text-gray-800">
										{row.name}{row.userId === currentUserId ? ' (you)' : ''}
									</td>
									<td class="px-4 py-2 text-right text-gray-700">{fmt(row.paid)}</td>
									<td class="px-4 py-2 text-right text-gray-500">{fmt(settlement.fairShare)}</td>
									<td class="px-4 py-2 text-right font-semibold {row.balance > 0 ? 'text-green-600' : row.balance < 0 ? 'text-red-500' : 'text-gray-400'}">
										{row.balance > 0 ? '+' : ''}{fmt(row.balance)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Settlements -->
				<h3 class="text-lg font-bold text-gray-700 mb-3">🤝 Who owes whom</h3>
				{#if settlement.settlements.length === 0}
					<p class="text-green-600 text-sm font-medium">Everyone is even — nothing to settle!</p>
				{:else}
					<div class="space-y-2">
						{#each settlement.settlements as s}
							<div class="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
								<span class="text-gray-800 text-sm">
									<span class="font-semibold">{s.from}</span>
									<span class="text-gray-500 mx-2">pays</span>
									<span class="font-semibold">{s.to}</span>
								</span>
								<span class="font-bold text-amber-700">{fmt(s.amount)}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}
</div>
