<script>
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { formatDate, formatCurrency } from '$lib/utils/helpers.js';
	import { Printer } from 'lucide-svelte';

	let tripId = $state('');
	let trip = $state(null);
	let activities = $state([]);
	let expenses = $state([]);
	let packingItems = $state([]);
	let checklistItems = $state([]);
	let members = $state([]);
	let loading = $state(true);
	let error = $state('');

	let memberMap = $derived(Object.fromEntries(members.map((m) => [m.userId, m.name])));

	let activitiesByDay = $derived.by(() => {
		const grouped = {};
		activities.forEach((a) => {
			if (!grouped[a.date]) grouped[a.date] = [];
			grouped[a.date].push(a);
		});
		return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
	});

	let totalExpenses = $derived(expenses.reduce((s, e) => s + e.amount, 0));

	let expensesByCategory = $derived.by(() => {
		const cats = {};
		expenses.forEach((e) => {
			const key = e.category || 'other';
			if (!cats[key]) cats[key] = 0;
			cats[key] += e.amount;
		});
		return Object.entries(cats).sort(([, a], [, b]) => b - a);
	});

	let sharedPacking = $derived(packingItems.filter((i) => !i.isPrivate));
	let privatePacking = $derived(packingItems.filter((i) => i.isPrivate));

	let sharedByCategory = $derived.by(() => {
		const cats = {};
		sharedPacking.forEach((i) => {
			const key = i.category || 'General';
			if (!cats[key]) cats[key] = [];
			cats[key].push(i);
		});
		return Object.entries(cats).sort(([a], [b]) => a.localeCompare(b));
	});

	let groupChecklist = $derived(checklistItems.filter((i) => !i.isPersonal));
	let individualChecklist = $derived(checklistItems.filter((i) => i.isPersonal));

	const categoryLabels = {
		accommodation: 'Accommodation',
		food: 'Food & Drink',
		transport: 'Transport',
		activities: 'Activities',
		other: 'Other'
	};

	const activityCategoryLabels = {
		sightseeing: 'Sightseeing',
		food: 'Food & Drink',
		transport: 'Transport',
		accommodation: 'Accommodation',
		activity: 'Activity',
		other: 'Other'
	};

	onMount(async () => {
		tripId = $page.params.tripId;

		const authRes = await fetch('/api/auth');
		const authData = await authRes.json();
		if (!authData.authenticated) {
			window.location.href = `/auth?redirect=/trips/${tripId}/print`;
			return;
		}

		try {
			const [tripRes, activitiesRes, expensesRes, packingRes, checklistRes, membersRes] =
				await Promise.all([
					fetch(`/api/trips/${tripId}`),
					fetch(`/api/trips/${tripId}/activities`),
					fetch(`/api/trips/${tripId}/expenses`),
					fetch(`/api/trips/${tripId}/packing`),
					fetch(`/api/trips/${tripId}/checklist`),
					fetch(`/api/trips/${tripId}/members`)
				]);

			const [tripData, activitiesData, expensesData, packingData, checklistData, membersData] =
				await Promise.all([
					tripRes.json(),
					activitiesRes.json(),
					expensesRes.json(),
					packingRes.json(),
					checklistRes.json(),
					membersRes.json()
				]);

			if (tripData.success) trip = tripData.trip;
			if (activitiesData.success) activities = activitiesData.activities;
			if (expensesData.success) expenses = expensesData.expenses;
			if (packingData.success) packingItems = packingData.items;
			if (checklistData.success) checklistItems = checklistData.items;
			if (membersData.success) members = membersData.members;
		} catch {
			error = 'Failed to load trip data';
		} finally {
			loading = false;
		}
	});
</script>

<div class="print-toolbar no-print">
	<div class="toolbar-inner">
		<a href="/trips/{tripId}" class="back-link">← Back to trip</a>
		<button onclick={() => window.print()} class="print-btn">
			<Printer size={16} />
			Print / Save as PDF
		</button>
	</div>
</div>

<div class="print-page">
	{#if loading}
		<div class="loading">Loading trip data...</div>
	{:else if error}
		<div class="error">{error}</div>
	{:else if trip}
		<!-- Header -->
		<div class="trip-header">
			<h1 class="trip-title">{trip.title}</h1>
			<p class="trip-meta">{trip.destination} &bull; {formatDate(trip.startDate)} – {formatDate(trip.endDate)}</p>
			{#if trip.description}
				<p class="trip-description">{trip.description}</p>
			{/if}
			<p class="trip-members">Members: {members.map((m) => m.name).join(', ')}</p>
		</div>

		<!-- Itinerary -->
		{#if activities.length > 0}
			<section class="section">
				<h2 class="section-title">Itinerary</h2>
				{#each activitiesByDay as [date, dayActivities]}
					<div class="day-block">
						<h3 class="day-heading">{formatDate(date)}</h3>
						<div class="activity-list">
							{#each dayActivities as activity}
								<div class="activity-item">
									<div class="activity-header">
										<span class="activity-title">{activity.title}</span>
										{#if activity.time}
											<span class="activity-time">{activity.time}</span>
										{/if}
									</div>
									{#if activity.location}
										<p class="activity-detail">📍 {activity.location}</p>
									{/if}
									{#if activity.description}
										<p class="activity-detail activity-desc">{activity.description}</p>
									{/if}
									<span class="activity-category">{activityCategoryLabels[activity.category] || activity.category}</span>
								</div>
							{/each}
						</div>
					</div>
				{/each}
			</section>
		{/if}

		<!-- Budget -->
		{#if expenses.length > 0}
			<section class="section">
				<h2 class="section-title">Budget</h2>

				<table class="expense-table">
					<thead>
						<tr>
							<th>Description</th>
							<th>Category</th>
							<th>Paid by</th>
							<th class="text-right">Amount</th>
						</tr>
					</thead>
					<tbody>
						{#each expenses as expense}
							<tr>
								<td>{expense.description}</td>
								<td>{categoryLabels[expense.category] || expense.category}</td>
								<td>{memberMap[expense.paidBy] || 'Unknown'}</td>
								<td class="text-right">{formatCurrency(expense.amount, trip.currency)}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="3" class="total-label">Total</td>
							<td class="text-right total-amount">{formatCurrency(totalExpenses, trip.currency)}</td>
						</tr>
					</tfoot>
				</table>

				{#if expensesByCategory.length > 0}
					<div class="category-summary">
						<h3 class="subsection-title">By Category</h3>
						<div class="category-grid">
							{#each expensesByCategory as [cat, amount]}
								<div class="category-row">
									<span class="category-name">{categoryLabels[cat] || cat}</span>
									<span class="category-amount">{formatCurrency(amount, trip.currency)}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</section>
		{/if}

		<!-- Packing List -->
		{#if packingItems.length > 0}
			<section class="section">
				<h2 class="section-title">Packing List</h2>

				{#if sharedByCategory.length > 0}
					<h3 class="subsection-title">Shared Items</h3>
					{#each sharedByCategory as [cat, items]}
						<div class="packing-category">
							<h4 class="packing-cat-heading">{cat}</h4>
							<ul class="packing-list">
								{#each items as item}
									<li class="packing-item {item.packed ? 'packed' : ''}">
										<span class="checkbox {item.packed ? 'checked' : ''}"></span>
										{item.item}
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				{/if}

				{#if privatePacking.length > 0}
					<h3 class="subsection-title">My Items</h3>
					<ul class="packing-list">
						{#each privatePacking as item}
							<li class="packing-item {item.packed ? 'packed' : ''}">
								<span class="checkbox {item.packed ? 'checked' : ''}"></span>
								{item.item}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<!-- Checklist -->
		{#if checklistItems.length > 0}
			<section class="section">
				<h2 class="section-title">Pre-Trip Checklist</h2>

				{#if groupChecklist.length > 0}
					<h3 class="subsection-title">Group Tasks</h3>
					<ul class="checklist">
						{#each groupChecklist as item}
							<li class="checklist-item {item.checked ? 'done' : ''}">
								<span class="checkbox {item.checked ? 'checked' : ''}"></span>
								{item.text}
							</li>
						{/each}
					</ul>
				{/if}

				{#if individualChecklist.length > 0}
					<h3 class="subsection-title">Individual Tasks</h3>
					<ul class="checklist">
						{#each individualChecklist as item}
							<li class="checklist-item {item.checked ? 'done' : ''}">
								<span class="checkbox {item.checked ? 'checked' : ''}"></span>
								{item.text}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<footer class="print-footer no-print-hide">
			<p>Generated by Travelyt &bull; {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
		</footer>
	{/if}
</div>

<style>
	/* Toolbar — screen only */
	.print-toolbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: #1e40af;
		color: white;
		z-index: 100;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}

	.toolbar-inner {
		max-width: 900px;
		margin: 0 auto;
		padding: 12px 24px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.back-link {
		color: rgba(255, 255, 255, 0.85);
		text-decoration: none;
		font-size: 14px;
	}

	.back-link:hover {
		color: white;
	}

	.print-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		background: white;
		color: #1e40af;
		border: none;
		padding: 8px 18px;
		border-radius: 8px;
		font-weight: 700;
		font-size: 14px;
		cursor: pointer;
	}

	.print-btn:hover {
		background: #eff6ff;
	}

	/* Page layout */
	.print-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 80px 48px 48px;
		font-family: Georgia, 'Times New Roman', serif;
		color: #111;
		font-size: 13px;
		line-height: 1.6;
	}

	.loading,
	.error {
		text-align: center;
		padding: 80px 0;
		color: #666;
	}

	/* Trip header */
	.trip-header {
		border-bottom: 3px solid #1e40af;
		padding-bottom: 20px;
		margin-bottom: 36px;
	}

	.trip-title {
		font-size: 28px;
		font-weight: bold;
		color: #1e3a8a;
		margin: 0 0 6px;
	}

	.trip-meta {
		font-size: 14px;
		color: #555;
		margin: 0 0 8px;
	}

	.trip-description {
		font-style: italic;
		color: #444;
		margin: 8px 0;
	}

	.trip-members {
		font-size: 12px;
		color: #666;
		margin: 6px 0 0;
	}

	/* Sections */
	.section {
		margin-bottom: 40px;
		page-break-inside: avoid;
	}

	.section-title {
		font-size: 18px;
		font-weight: bold;
		color: #1e3a8a;
		border-bottom: 1px solid #bfdbfe;
		padding-bottom: 6px;
		margin: 0 0 16px;
	}

	.subsection-title {
		font-size: 13px;
		font-weight: bold;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 16px 0 8px;
	}

	/* Itinerary */
	.day-block {
		margin-bottom: 20px;
		page-break-inside: avoid;
	}

	.day-heading {
		font-size: 14px;
		font-weight: bold;
		color: #1d4ed8;
		background: #eff6ff;
		padding: 4px 10px;
		border-left: 3px solid #3b82f6;
		margin: 0 0 8px;
	}

	.activity-list {
		padding-left: 12px;
	}

	.activity-item {
		border-bottom: 1px solid #f3f4f6;
		padding: 6px 0;
	}

	.activity-item:last-child {
		border-bottom: none;
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.activity-title {
		font-weight: bold;
		color: #111;
	}

	.activity-time {
		font-size: 12px;
		color: #6b7280;
		font-family: system-ui, sans-serif;
	}

	.activity-detail {
		font-size: 12px;
		color: #555;
		margin: 2px 0;
	}

	.activity-desc {
		font-style: italic;
	}

	.activity-category {
		display: inline-block;
		font-size: 10px;
		color: #6b7280;
		background: #f3f4f6;
		padding: 1px 6px;
		border-radius: 10px;
		font-family: system-ui, sans-serif;
		margin-top: 3px;
	}

	/* Budget table */
	.expense-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		font-family: system-ui, sans-serif;
		margin-bottom: 16px;
	}

	.expense-table th {
		background: #eff6ff;
		color: #1e3a8a;
		font-weight: 700;
		padding: 7px 10px;
		text-align: left;
		border-bottom: 2px solid #bfdbfe;
	}

	.expense-table td {
		padding: 6px 10px;
		border-bottom: 1px solid #f3f4f6;
		vertical-align: top;
	}

	.expense-table tfoot td {
		border-top: 2px solid #1e3a8a;
		border-bottom: none;
		padding-top: 8px;
	}

	.text-right {
		text-align: right;
	}

	.total-label {
		font-weight: bold;
		color: #1e3a8a;
	}

	.total-amount {
		font-weight: bold;
		color: #1e3a8a;
	}

	.category-summary {
		margin-top: 8px;
	}

	.category-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 6px;
	}

	.category-row {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		font-family: system-ui, sans-serif;
		background: #f9fafb;
		padding: 4px 10px;
		border-radius: 4px;
	}

	.category-name {
		color: #374151;
	}

	.category-amount {
		font-weight: bold;
		color: #111;
	}

	/* Packing */
	.packing-category {
		margin-bottom: 12px;
	}

	.packing-cat-heading {
		font-size: 12px;
		font-weight: bold;
		color: #374151;
		margin: 0 0 4px;
		font-family: system-ui, sans-serif;
	}

	.packing-list,
	.checklist {
		list-style: none;
		padding: 0;
		margin: 0;
		columns: 2;
		column-gap: 24px;
	}

	.packing-item,
	.checklist-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-family: system-ui, sans-serif;
		padding: 3px 0;
		break-inside: avoid;
	}

	.packing-item.packed,
	.checklist-item.done {
		color: #9ca3af;
		text-decoration: line-through;
	}

	.checkbox {
		display: inline-block;
		width: 12px;
		height: 12px;
		border: 1.5px solid #9ca3af;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.checkbox.checked {
		border-color: #1d4ed8;
		background: #1d4ed8;
		position: relative;
	}

	.checkbox.checked::after {
		content: '';
		position: absolute;
		left: 2px;
		top: -1px;
		width: 6px;
		height: 9px;
		border: 2px solid white;
		border-top: none;
		border-left: none;
		transform: rotate(45deg);
	}

	/* Footer */
	.print-footer {
		margin-top: 48px;
		padding-top: 12px;
		border-top: 1px solid #e5e7eb;
		font-size: 11px;
		color: #9ca3af;
		text-align: center;
		font-family: system-ui, sans-serif;
	}

	/* Print styles */
	@media print {
		.no-print {
			display: none !important;
		}

		.print-page {
			padding: 0;
			max-width: 100%;
		}

		.section {
			page-break-inside: avoid;
		}

		.day-block {
			page-break-inside: avoid;
		}

		.expense-table {
			page-break-inside: avoid;
		}
	}
</style>
