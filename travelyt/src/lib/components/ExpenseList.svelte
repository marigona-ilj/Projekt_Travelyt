<script>
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';
	import { Wallet, ArrowRightLeft, Pencil, Trash2 } from 'lucide-svelte';

	let { tripId, currentUserId, currency = 'CHF', oncurrencychange = null } = $props();

	const currencies = ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];

	const categoryConfig = {
		accommodation: { label: 'Accommodation', color: 'bg-blue-500' },
		food:          { label: 'Food & Drink',   color: 'bg-orange-400' },
		transport:     { label: 'Transport',       color: 'bg-purple-500' },
		activities:    { label: 'Activities',      color: 'bg-green-500' },
		other:         { label: 'Other',           color: 'bg-gray-400' }
	};
	const categoryKeys = Object.keys(categoryConfig);

	function handleCurrencyChange(event) {
		if (oncurrencychange) oncurrencychange(event.target.value);
	}

	let expenses = $state([]);
	let members = $state([]);
	let total = $state(0);
	let loading = $state(true);
	let error = $state('');
	let showNewExpenseForm = $state(false);
	let newExpense = $state({ description: '', amount: '', date: '', paidBy: '', participants: [], category: '' });
	let formLoading = $state(false);
	let editingId = $state(null);
	let editingExpense = $state({ description: '', amount: '', date: '', paidBy: '', participants: [], category: 'other' });
	let editLoading = $state(false);

	const fmt = (n) => formatCurrency(n, currency);

	let memberMap = $derived(
		Object.fromEntries(members.map((m) => [m.userId, m.name]))
	);

	let settlement = $derived(calculateSettlement(expenses, members));

	let categoryBreakdown = $derived.by(() => {
		if (expenses.length === 0) return [];
		const totals = {};
		for (const e of expenses) {
			const cat = e.category || 'other';
			totals[cat] = (totals[cat] || 0) + e.amount;
		}
		return categoryKeys
			.filter((k) => totals[k])
			.map((k) => ({ key: k, ...categoryConfig[k], amount: Math.round(totals[k] * 100) / 100, pct: Math.round((totals[k] / total) * 100) }));
	});

	function calculateSettlement(exps, mbrs) {
		if (mbrs.length <= 1 || exps.length === 0) return null;

		const paid = Object.fromEntries(mbrs.map((m) => [m.userId, 0]));
		const owes = Object.fromEntries(mbrs.map((m) => [m.userId, 0]));

		exps.forEach((e) => {
			if (paid[e.paidBy] !== undefined) paid[e.paidBy] += e.amount;
			const parts = e.participants?.length > 0 ? e.participants : mbrs.map((m) => m.userId);
			const share = e.amount / parts.length;
			parts.forEach((uid) => {
				if (owes[uid] !== undefined) owes[uid] += share;
			});
		});

		const balances = mbrs.map((m) => ({
			userId: m.userId,
			name: m.name,
			paid: Math.round((paid[m.userId] || 0) * 100) / 100,
			owes: Math.round((owes[m.userId] || 0) * 100) / 100,
			balance: Math.round(((paid[m.userId] || 0) - (owes[m.userId] || 0)) * 100) / 100
		}));

		const creditors = balances
			.filter((b) => b.balance > 0.01)
			.map((b) => ({ ...b, remaining: b.balance }))
			.sort((a, b) => b.remaining - a.remaining);
		const debtors = balances
			.filter((b) => b.balance < -0.01)
			.map((b) => ({ ...b, remaining: -b.balance }))
			.sort((a, b) => b.remaining - a.remaining);

		const settlements = [];
		let ci = 0, di = 0;
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

		return { balances, settlements };
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
		newExpense = { description: '', amount: '', date: '', paidBy: currentUserId, participants: members.map((m) => m.userId), category: '' };
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

	function startEditExpense(expense) {
		editingId = expense.id;
		editingExpense = {
			description: expense.description,
			amount: expense.amount,
			date: expense.date?.split('T')[0] ?? expense.date,
			paidBy: expense.paidBy,
			participants: expense.participants?.length > 0 ? expense.participants : members.map((m) => m.userId),
			category: expense.category || 'other'
		};
	}

	function cancelEditExpense() {
		editingId = null;
	}

	async function saveEditExpense(event) {
		if (event?.preventDefault) event.preventDefault();
		if (!editingExpense.description || !editingExpense.amount || !editingExpense.date) return;
		editLoading = true;
		try {
			const response = await fetch(`/api/trips/${tripId}/expenses/${editingId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(editingExpense)
			});
			const data = await response.json();
			if (data.success) {
				editingId = null;
				await fetchExpenses();
			} else {
				error = data.error || 'Failed to update';
			}
		} catch {
			error = 'Network error';
		} finally {
			editLoading = false;
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
			<div class="flex items-center gap-2 mt-1">
				<p class="text-lg font-semibold text-blue-600">Total: {fmt(total)}</p>
				<div class="relative group">
					<select
						value={currency}
						onchange={handleCurrencyChange}
						disabled={expenses.length > 0}
						class="text-sm border border-gray-300 rounded px-2 py-0.5 text-gray-600 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#each currencies as c}
							<option value={c}>{c}</option>
						{/each}
					</select>
					{#if expenses.length > 0}
						<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
							Currency cannot be changed once expenses have been added
						</div>
					{/if}
				</div>
			</div>
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
					<div>
						<label class="block text-xs text-gray-500 mb-1">Amount ({currency})</label>
						<input
							type="number"
							bind:value={newExpense.amount}
							placeholder="0.00"
							step="0.01"
							min="0"
							class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
							required
						/>
					</div>
					<div>
						<div class="flex items-center gap-1 mb-1">
							<label class="text-xs text-gray-500">Date</label>
							<div class="relative group">
								<span class="text-xs text-gray-400 cursor-help border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">?</span>
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
									Date of payment or purchase
								</div>
							</div>
						</div>
						<input
						type="date"
						bind:value={newExpense.date}
						class="w-full px-3 py-2 border border-gray-300 rounded text-sm"
						required
						/>
					</div>
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
					<div class="mb-3">
						<label class="block text-xs text-gray-500 mb-1">Split between</label>
						<div class="flex flex-wrap gap-3">
							{#each members as member}
								<label class="flex items-center gap-1.5 text-sm cursor-pointer">
									<input
										type="checkbox"
										checked={newExpense.participants.includes(member.userId)}
										onchange={(e) => {
											if (e.target.checked) {
												newExpense.participants = [...newExpense.participants, member.userId];
											} else {
												newExpense.participants = newExpense.participants.filter((id) => id !== member.userId);
											}
										}}
										class="w-3.5 h-3.5"
									/>
									{member.name}{member.userId === currentUserId ? ' (you)' : ''}
								</label>
							{/each}
						</div>
					</div>
				{/if}
				<div class="mb-3">
					<label class="block text-xs text-gray-500 mb-1">Category</label>
					<select bind:value={newExpense.category} required class="w-full px-3 py-2 border border-gray-300 rounded text-sm {newExpense.category === '' ? 'text-gray-400' : 'text-gray-800'}">
						<option value="" disabled>Select a category...</option>
						{#each categoryKeys as key}
							<option value={key}>{categoryConfig[key].label}</option>
						{/each}
					</select>
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
				<div class="bg-gray-50 rounded-lg p-3">
					{#if editingId === expense.id}
						<form onsubmit={saveEditExpense}>
							<div class="mb-2">
								<input
									type="text"
									bind:value={editingExpense.description}
									class="w-full px-3 py-2 border border-blue-400 rounded text-sm"
									required
								/>
							</div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<input
									type="number"
									bind:value={editingExpense.amount}
									step="0.01"
									min="0"
									class="px-3 py-2 border border-gray-300 rounded text-sm"
									required
								/>
								<input
									type="date"
									bind:value={editingExpense.date}
									class="px-3 py-2 border border-gray-300 rounded text-sm"
									required
								/>
							</div>
							{#if members.length > 1}
								<div class="mb-2">
									<select bind:value={editingExpense.paidBy} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
										{#each members as member}
											<option value={member.userId}>
												{member.name}{member.userId === currentUserId ? ' (you)' : ''}
											</option>
										{/each}
									</select>
								</div>
								<div class="mb-2">
									<label class="block text-xs text-gray-500 mb-1">Split between</label>
									<div class="flex flex-wrap gap-3">
										{#each members as member}
											<label class="flex items-center gap-1.5 text-sm cursor-pointer">
												<input
													type="checkbox"
													checked={editingExpense.participants.includes(member.userId)}
													onchange={(e) => {
														if (e.target.checked) {
															editingExpense.participants = [...editingExpense.participants, member.userId];
														} else {
															editingExpense.participants = editingExpense.participants.filter((id) => id !== member.userId);
														}
													}}
													class="w-3.5 h-3.5"
												/>
												{member.name}{member.userId === currentUserId ? ' (you)' : ''}
											</label>
										{/each}
									</div>
								</div>
							{/if}
							<div class="mb-2">
								<select bind:value={editingExpense.category} class="w-full px-3 py-2 border border-gray-300 rounded text-sm">
									{#each categoryKeys as key}
										<option value={key}>{categoryConfig[key].label}</option>
									{/each}
								</select>
							</div>
							<div class="flex gap-2">
								<button type="submit" disabled={editLoading} class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1 px-3 rounded text-sm">
									{editLoading ? 'Saving...' : '✓ Save'}
								</button>
								<button type="button" onclick={cancelEditExpense} class="bg-gray-300 text-gray-800 py-1 px-3 rounded text-sm">
									Cancel
								</button>
							</div>
						</form>
					{:else}
						<div class="flex justify-between items-center">
							<div>
								<div class="flex items-center gap-2 mb-0.5">
									<p class="font-semibold text-gray-800">{expense.description}</p>
									<span class="text-xs px-1.5 py-0.5 rounded-full text-white {categoryConfig[expense.category || 'other'].color}">
										{categoryConfig[expense.category || 'other'].label}
									</span>
								</div>
								<p class="text-xs text-gray-500">
									{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
									· paid by <span class="font-medium text-gray-700">
										{memberMap[expense.paidBy] ?? 'Unknown'}
										{expense.paidBy === currentUserId ? ' (you)' : ''}
									</span>
								</p>
								{#if expense.participants?.length > 0 && expense.participants.length < members.length}
									<p class="text-xs text-gray-400 mt-0.5">
										Split with: {expense.participants.map((uid) => memberMap[uid] ?? 'Unknown').join(', ')}
									</p>
								{/if}
							</div>
							<div class="flex items-center gap-3">
								<span class="font-semibold text-gray-800">{fmt(expense.amount)}</span>
								<button onclick={() => startEditExpense(expense)} class="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>
								<button onclick={() => deleteExpense(expense.id)} class="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Category breakdown -->
		{#if categoryBreakdown.length > 0}
			<div class="border-t border-gray-200 pt-6 mb-6">
				<h3 class="text-lg font-bold text-gray-700 mb-3">By Category</h3>
				<div class="space-y-2">
					{#each categoryBreakdown as cat}
						<div class="flex items-center gap-3">
							<span class="w-28 text-sm text-gray-600 shrink-0">{cat.label}</span>
							<div class="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
								<div class="h-2 rounded-full {cat.color}" style="width: {cat.pct}%"></div>
							</div>
							<span class="text-sm font-semibold text-gray-700 w-24 text-right shrink-0">{fmt(cat.amount)}</span>
							<span class="text-xs text-gray-400 w-8 text-right shrink-0">{cat.pct}%</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Group settlement (only for group trips) -->
		{#if settlement}
			<div class="border-t border-gray-200 pt-6">
				<!-- Who paid what -->
				<h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2"><Wallet size={18} /> Who paid what</h3>
				<div class="bg-gray-50 rounded-lg overflow-hidden mb-6">
					<table class="w-full text-sm">
						<thead>
							<tr class="bg-gray-100 text-gray-600 text-xs uppercase">
								<th class="text-left px-4 py-2">Member</th>
								<th class="text-right px-4 py-2">Paid</th>
								<th class="text-right px-4 py-2">Owes</th>
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
									<td class="px-4 py-2 text-right text-gray-500">{fmt(row.owes)}</td>
									<td class="px-4 py-2 text-right font-semibold {row.balance > 0 ? 'text-green-600' : row.balance < 0 ? 'text-red-500' : 'text-gray-400'}">
										{row.balance > 0 ? '+' : ''}{fmt(row.balance)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- Settlements -->
				<h3 class="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2"><ArrowRightLeft size={18} /> Who owes whom</h3>
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
