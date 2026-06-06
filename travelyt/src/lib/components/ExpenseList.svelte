<script>
	import { formatCurrency } from '$lib/utils/helpers.js';
	import { onMount } from 'svelte';
	import { Wallet, ArrowRightLeft, Pencil, Trash2 } from 'lucide-svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { tripId, currentUserId, currency = 'CHF', oncurrencychange = null, startDate = '', endDate = '' } = $props();

	const currencies = ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK'];

	const categoryConfig = {
		accommodation: { label: 'Accommodation', color: 'bg-blue-500',   dot: 'bg-blue-500',   border: 'border-l-blue-500'   },
		food:          { label: 'Food & Drink',   color: 'bg-orange-400', dot: 'bg-orange-400', border: 'border-l-orange-400' },
		transport:     { label: 'Transport',       color: 'bg-purple-500', dot: 'bg-purple-500', border: 'border-l-purple-500' },
		activities:    { label: 'Activities',      color: 'bg-green-500',  dot: 'bg-green-500',  border: 'border-l-green-500'  },
		other:         { label: 'Other',           color: 'bg-gray-400',   dot: 'bg-gray-400',   border: 'border-l-gray-400'   }
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

	let isPast = $derived(endDate ? new Date(endDate) < new Date() : false);

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

	let tripStats = $derived.by(() => {
		if (!startDate || !endDate || expenses.length === 0) return null;
		const byDate = {};
		for (const e of expenses) {
			const d = (e.date ?? '').split('T')[0];
			byDate[d] = (byDate[d] || 0) + e.amount;
		}
		const [topDate, topDateAmount] = Object.entries(byDate).sort(([, a], [, b]) => b - a)[0] ?? [null, 0];
		const topCat = [...categoryBreakdown].sort((a, b) => b.amount - a.amount)[0] ?? null;
		return {
			busiestDay: topDate ? {
				label: new Date(topDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
				amount: Math.round(topDateAmount * 100) / 100
			} : null,
			topCategory: topCat
		};
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
					fromId: debtors[di].userId,
					to: creditors[ci].name,
					toId: creditors[ci].userId,
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
		await Promise.all([fetchExpenses(), fetchMembers(), fetchRepayments()]);
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

	let repayments = $state([]);
	let activeRepaymentForm = $state(null);
	let repaymentAmount = $state('');
	let repaymentDate = $state('');
	let repaymentNote = $state('');
	let repaymentLoading = $state(false);

	let repaymentMap = $derived.by(() => {
		const map = {};
		for (const r of repayments) {
			const key = `${r.from}-${r.to}`;
			if (!map[key]) map[key] = [];
			map[key].push(r);
		}
		return map;
	});

	async function fetchRepayments() {
		try {
			const res = await fetch(`/api/trips/${tripId}/repayments`);
			const data = await res.json();
			if (data.success) repayments = data.repayments;
		} catch { /* silently ignore */ }
	}

	async function addRepayment(fromId, toId) {
		const amt = parseFloat(repaymentAmount);
		if (!amt || amt <= 0 || !repaymentDate) return;
		repaymentLoading = true;
		try {
			const res = await fetch(`/api/trips/${tripId}/repayments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ from: fromId, to: toId, amount: amt, date: repaymentDate, note: repaymentNote })
			});
			const data = await res.json();
			if (data.success) {
				activeRepaymentForm = null;
				repaymentAmount = '';
				repaymentNote = '';
				await fetchRepayments();
			}
		} catch { /* ignore */ } finally {
			repaymentLoading = false;
		}
	}

	async function deleteRepayment(id) {
		try {
			const res = await fetch(`/api/trips/${tripId}/repayments/${id}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) await fetchRepayments();
		} catch { /* ignore */ }
	}

	let deleteDialogOpen = $state(false);
	let deleteTargetId = $state(null);
	let deleteTargetLabel = $state('');

	function requestDeleteExpense(expense) {
		deleteTargetId = expense.id;
		deleteTargetLabel = expense.description;
		deleteDialogOpen = true;
	}

	function cancelDeleteExpense() {
		deleteDialogOpen = false;
		deleteTargetId = null;
		deleteTargetLabel = '';
	}

	async function confirmDeleteExpense() {
		const id = deleteTargetId;
		cancelDeleteExpense();
		try {
			const response = await fetch(`/api/trips/${tripId}/expenses/${id}`, { method: 'DELETE' });
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
</script>

<ConfirmDialog
	open={deleteDialogOpen}
	title="Delete expense?"
	message={deleteTargetLabel}
	confirmLabel="Delete"
	onconfirm={confirmDeleteExpense}
	oncancel={cancelDeleteExpense}
/>

<div>
	<!-- Header -->
	<div class="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-4 py-3.5 mb-6">
		<div>
			<h2 class="text-2xl font-bold text-white">Budget</h2>
			<div class="flex items-center gap-2 mt-1">
				<p class="text-lg font-semibold text-white/90">Total: {fmt(total)}</p>
				<div class="relative group">
					<select
						value={currency}
						onchange={handleCurrencyChange}
						disabled={expenses.length > 0}
						class="text-sm border border-white/30 rounded px-2 py-0.5 text-white bg-white/20 focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
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
			class="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-2 px-4 rounded-lg text-sm shadow-sm transition"
		>
			+ Add Expense
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	<!-- Trip stats summary — only for past trips with expenses -->
	{#if isPast && !loading && tripStats}
		<div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-5 mb-6">
			<p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4">Trip Summary</p>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div>
					<p class="text-xl font-bold text-gray-800 dark:text-gray-100">{fmt(total)}</p>
					<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">Total spent</p>
				</div>
				{#if tripStats.busiestDay}
					<div>
						<p class="text-xl font-bold text-gray-800 dark:text-gray-100">{fmt(tripStats.busiestDay.amount)}</p>
						<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">Most spent in a day</p>
						<p class="text-sm text-gray-600 dark:text-gray-300">{tripStats.busiestDay.label}</p>
					</div>
				{/if}
				{#if tripStats.topCategory}
					<div>
						<div class="flex items-center gap-1.5 mb-0.5">
							<span class="w-2.5 h-2.5 rounded-full {tripStats.topCategory.color} shrink-0"></span>
							<p class="text-xl font-bold text-gray-800 dark:text-gray-100">{tripStats.topCategory.label}</p>
						</div>
						<p class="text-sm text-gray-600 dark:text-gray-300">Top category</p>
						<p class="text-sm text-gray-600 dark:text-gray-300">{tripStats.topCategory.pct}% of budget</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Add expense form -->
	{#if showNewExpenseForm}
		<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 border border-gray-200 dark:border-gray-700">
			<form onsubmit={createExpense}>
				<div class="mb-3">
					<input
						type="text"
						bind:value={newExpense.description}
						placeholder="What was this for? (e.g. Hotel)"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
				<div class="grid grid-cols-2 gap-2 mb-3">
					<div>
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Amount ({currency})</label>
						<input
							type="number"
							bind:value={newExpense.amount}
							placeholder="0.00"
							step="0.01"
							min="0"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
							required
						/>
					</div>
					<div>
						<div class="flex items-center gap-1 mb-1">
							<label class="text-sm font-medium text-gray-700 dark:text-gray-200">Date</label>
							<div class="relative group">
								<span class="text-xs text-gray-400 cursor-help border border-gray-300 dark:border-gray-600 rounded-full w-4 h-4 flex items-center justify-center font-bold leading-none">?</span>
								<div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
									Date of payment or purchase
								</div>
							</div>
						</div>
						<input
						type="date"
						bind:value={newExpense.date}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
						required
						/>
					</div>
				</div>
				{#if members.length > 1}
					<div class="mb-3">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Paid by</label>
						<select
							bind:value={newExpense.paidBy}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
						>
							{#each members as member}
								<option value={member.userId}>
									{member.name}{member.userId === currentUserId ? ' (you)' : ''}
								</option>
							{/each}
						</select>
					</div>
					<div class="mb-3">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Split between</label>
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
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Category</label>
					<select bind:value={newExpense.category} required class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 {newExpense.category === '' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100'}">
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
						class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-1 px-3 rounded text-sm"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	{#if loading}
		<p class="text-gray-600 dark:text-gray-300">Loading expenses...</p>
	{:else if expenses.length === 0}
		<p class="text-gray-600 dark:text-gray-300 text-sm">No expenses yet. Add one to start tracking!</p>
	{:else}
		<!-- Expense list -->
		<div class="space-y-2 mb-8">
			{#each expenses as expense}
				<div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
					{#if editingId === expense.id}
						<form onsubmit={saveEditExpense} class="px-4 py-3">
							<div class="mb-2">
								<input
									type="text"
									bind:value={editingExpense.description}
									class="w-full px-3 py-2 border border-blue-400 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
									required
								/>
							</div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<input
									type="number"
									bind:value={editingExpense.amount}
									step="0.01"
									min="0"
									class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
									required
								/>
								<input
									type="date"
									bind:value={editingExpense.date}
									class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100"
									required
								/>
							</div>
							{#if members.length > 1}
								<div class="mb-2">
									<select bind:value={editingExpense.paidBy} class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100">
										{#each members as member}
											<option value={member.userId}>
												{member.name}{member.userId === currentUserId ? ' (you)' : ''}
											</option>
										{/each}
									</select>
								</div>
								<div class="mb-2">
									<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Split between</label>
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
								<select bind:value={editingExpense.category} class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-gray-100">
									{#each categoryKeys as key}
										<option value={key}>{categoryConfig[key].label}</option>
									{/each}
								</select>
							</div>
							<div class="flex gap-2">
								<button type="submit" disabled={editLoading} class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-1 px-3 rounded text-sm">
									{editLoading ? 'Saving...' : '✓ Save'}
								</button>
								<button type="button" onclick={cancelEditExpense} class="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-100 py-1 px-3 rounded text-sm">
									Cancel
								</button>
							</div>
						</form>
					{:else}
						<div class="flex items-center gap-3 px-4 py-3">
							<!-- Info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<p class="font-semibold text-gray-800 dark:text-gray-100 truncate">{expense.description}</p>
									<span class="text-xs px-2 py-0.5 rounded-full text-white shrink-0 {categoryConfig[expense.category || 'other'].color}">{categoryConfig[expense.category || 'other'].label}</span>
								</div>
								<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
									{new Date(expense.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
									· paid by <span class="font-semibold text-gray-700 dark:text-gray-200">{memberMap[expense.paidBy] ?? 'Unknown'}{expense.paidBy === currentUserId ? ' (you)' : ''}</span>
								</p>
								{#if expense.participants?.length > 0 && expense.participants.length < members.length}
									<p class="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
										Split with: <span class="font-semibold text-gray-700 dark:text-gray-200">{expense.participants.map((uid) => memberMap[uid] ?? 'Unknown').join(', ')}</span>
									</p>
								{/if}
							</div>
							<!-- Amount + actions -->
							<div class="flex items-center gap-2 shrink-0">
								<span class="text-base font-bold text-gray-800 dark:text-gray-100">{fmt(expense.amount)}</span>
								<button onclick={() => startEditExpense(expense)} class="text-gray-300 hover:text-blue-500 dark:text-gray-600 dark:hover:text-blue-400 transition"><Pencil size={14} /></button>
								<button onclick={() => requestDeleteExpense(expense)} class="text-gray-300 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-400 transition"><Trash2 size={14} /></button>
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Category breakdown -->
		{#if categoryBreakdown.length > 0}
			<div class="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
				<h3 class="text-lg font-bold text-gray-700 dark:text-gray-200 mb-3">By Category</h3>
				<div class="space-y-2">
					{#each categoryBreakdown as cat}
						<div class="flex items-center gap-3">
							<span class="w-28 text-sm text-gray-600 dark:text-gray-300 shrink-0">{cat.label}</span>
							<div class="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
								<div class="h-2 rounded-full {cat.color}" style="width: {cat.pct}%"></div>
							</div>
							<span class="text-sm font-semibold text-gray-700 dark:text-gray-200 w-24 text-right shrink-0">{fmt(cat.amount)}</span>
							<span class="text-sm text-gray-600 dark:text-gray-300 w-8 text-right shrink-0">{cat.pct}%</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Group settlement (only for group trips) -->
		{#if settlement}
			<div class="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-8">

				<!-- Who paid what -->
				<div>
					<div class="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-4 py-3.5 mb-4">
						<div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
							<Wallet size={16} class="text-white" />
						</div>
						<h3 class="text-lg font-bold text-white">Who paid what</h3>
					</div>
					<div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
						{#each settlement.balances as row, i}
							<div class="flex items-center gap-4 px-4 py-3.5 {i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/60 dark:bg-gray-800/60'}">
								<div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
									{row.name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
										{row.name}{row.userId === currentUserId ? ' (you)' : ''}
									</p>
									<div class="flex items-center gap-3 mt-1">
										<span class="text-sm text-gray-600 dark:text-gray-300">Paid <span class="font-bold text-gray-900 dark:text-white">{fmt(row.paid)}</span></span>
										<span class="text-gray-400 dark:text-gray-500">·</span>
										<span class="text-sm text-gray-600 dark:text-gray-300">Share <span class="font-bold text-gray-900 dark:text-white">{fmt(row.owes)}</span></span>
									</div>
								</div>
								<span class="inline-block text-sm font-bold px-3 py-1 rounded-lg shrink-0 {row.balance > 0.01 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : row.balance < -0.01 ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}">
									{row.balance > 0 ? '+' : ''}{fmt(row.balance)}
								</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- Who owes whom -->
				<div>
					<div class="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl px-4 py-3.5 mb-4">
						<div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
							<ArrowRightLeft size={16} class="text-white" />
						</div>
						<h3 class="text-lg font-bold text-white">Who owes whom</h3>
					</div>
					{#if settlement.settlements.length === 0}
						<div class="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-4">
							<div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center shrink-0">
								<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-green-600 dark:text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
							</div>
							<div>
								<p class="text-sm font-semibold text-green-700 dark:text-green-400">All settled up!</p>
								<p class="text-sm text-green-700 dark:text-green-400">Everyone is even — nothing to pay.</p>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							{#each settlement.settlements as s}
								{@const key = `${s.fromId}-${s.toId}`}
								{@const paidList = repaymentMap[key] || []}
								{@const totalRepaid = Math.round(paidList.reduce((sum, r) => sum + r.amount, 0) * 100) / 100}
								{@const remaining = Math.max(0, Math.round((s.amount - totalRepaid) * 100) / 100)}
								{@const isSettled = remaining < 0.01}
								{@const pct = Math.min(100, Math.round((totalRepaid / s.amount) * 100))}
								<div class="bg-white dark:bg-gray-800 border {isSettled ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'} rounded-xl overflow-hidden shadow-sm">

									<!-- Main row -->
									<div class="flex items-center gap-3 px-4 py-4">
										<div class="w-10 h-10 rounded-full {isSettled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'} flex items-center justify-center text-sm font-bold shrink-0">
											{s.from.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 flex-wrap">
												<span class="text-base font-bold text-gray-800 dark:text-gray-100">{s.from}</span>
												<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
												<span class="text-base font-bold text-gray-800 dark:text-gray-100">{s.to}</span>
											</div>
											<p class="text-sm font-medium text-gray-600 dark:text-gray-300 mt-0.5">owes</p>
										</div>
										<div class="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 text-sm font-bold shrink-0">
											{s.to.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
										</div>
										<div class="text-right ml-3 shrink-0">
											{#if isSettled}
												<span class="inline-flex items-center gap-1 text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 px-3 py-1 rounded-lg">
													<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
													Settled
												</span>
											{:else}
												<p class="text-xl font-bold text-blue-600 dark:text-blue-400">{fmt(remaining)}</p>
												{#if totalRepaid > 0}
													<p class="text-sm font-medium text-gray-600 dark:text-gray-300 mt-0.5">of {fmt(s.amount)} total</p>
												{/if}
											{/if}
										</div>
									</div>

									<!-- Progress bar (only if partial payments) -->
									{#if totalRepaid > 0 && !isSettled}
										<div class="px-4 pb-3">
											<div class="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1.5">
												<span><span class="font-semibold text-gray-800 dark:text-gray-100">{fmt(totalRepaid)}</span> paid</span>
												<span><span class="font-semibold text-gray-800 dark:text-gray-100">{fmt(remaining)}</span> remaining · {pct}%</span>
											</div>
											<div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
												<div class="h-2.5 rounded-full bg-blue-500 transition-all duration-300" style="width: {pct}%"></div>
											</div>
										</div>
									{/if}

									<!-- Repayment history -->
									{#if paidList.length > 0}
										<div class="px-4 pb-3 space-y-2">
											<p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Payments recorded</p>
											{#each paidList as r}
												<div class="flex items-center justify-between border-l-4 border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20 rounded-r-xl px-3 py-2.5">
													<div class="flex flex-col gap-0.5">
														<span class="text-sm font-bold text-gray-800 dark:text-gray-100">{fmt(r.amount)}</span>
														<span class="text-sm text-gray-600 dark:text-gray-300">
															{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}{r.note ? ` · ${r.note}` : ''}
														</span>
													</div>
													<button
														onclick={() => deleteRepayment(r.id)}
														class="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
														title="Remove payment"
													>
														<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
													</button>
												</div>
											{/each}
										</div>
									{/if}

									<!-- Record payment button / inline form -->
									{#if !isSettled}
										<div class="px-4 pb-4">
											{#if activeRepaymentForm === key}
												<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
													<p class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Record a payment</p>
													<form onsubmit={(e) => { e.preventDefault(); addRepayment(s.fromId, s.toId); }} novalidate>
														<div class="flex gap-2 flex-wrap mb-2">
															<input
																type="number"
																bind:value={repaymentAmount}
																placeholder="Amount"
																step="0.01"
																min="0.01"
																class="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
															<input
																type="date"
																bind:value={repaymentDate}
																class="flex-1 min-w-36 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
														<input
															type="text"
															bind:value={repaymentNote}
															placeholder="Note (optional) — e.g. Cash, Twint, Bank transfer"
															class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
														/>
														<div class="flex gap-2">
															<button
																type="submit"
																disabled={repaymentLoading}
																class="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
															>{repaymentLoading ? 'Saving...' : 'Save payment'}</button>
															<button
																type="button"
																onclick={() => { activeRepaymentForm = null; repaymentAmount = ''; repaymentNote = ''; }}
																class="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition"
															>Cancel</button>
														</div>
													</form>
												</div>
											{:else}
												<button
													onclick={() => { activeRepaymentForm = key; repaymentDate = new Date().toISOString().split('T')[0]; repaymentAmount = ''; repaymentNote = ''; }}
													class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-700 px-4 py-2 rounded-lg transition"
												>
													<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
													Record payment
												</button>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

			</div>
		{/if}
	{/if}
</div>
