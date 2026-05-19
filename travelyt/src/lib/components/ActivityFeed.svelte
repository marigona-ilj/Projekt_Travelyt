<script>
	import { Wallet, Package, Target, UserPlus, UserMinus, RefreshCw } from 'lucide-svelte';

	let { entries = [], loading = false, error = '', onRefresh } = $props();

	const iconMap = {
		expense_added: Wallet,
		expense_deleted: Wallet,
		packing_added: Package,
		packing_deleted: Package,
		activity_added: Target,
		activity_updated: Target,
		activity_deleted: Target,
		member_added: UserPlus,
		member_removed: UserMinus
	};

	const colorMap = {
		expense_added: 'text-green-600 bg-green-50',
		expense_deleted: 'text-red-500 bg-red-50',
		packing_added: 'text-blue-600 bg-blue-50',
		packing_deleted: 'text-red-500 bg-red-50',
		activity_added: 'text-purple-600 bg-purple-50',
		activity_updated: 'text-purple-500 bg-purple-50',
		activity_deleted: 'text-red-500 bg-red-50',
		member_added: 'text-teal-600 bg-teal-50',
		member_removed: 'text-red-500 bg-red-50'
	};

	function timeAgo(date) {
		const diff = Math.floor((Date.now() - new Date(date)) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
		return new Date(date).toLocaleDateString();
	}
</script>

<div>
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-semibold text-gray-800">Recent Activity</h2>
		<button
			onclick={onRefresh}
			class="text-gray-500 hover:text-gray-700 p-1 rounded"
			title="Refresh"
		>
			<RefreshCw size={16} />
		</button>
	</div>

	{#if loading}
		<div class="flex justify-center py-8">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if error}
		<p class="text-red-500 text-sm">{error}</p>
	{:else if entries.length === 0}
		<p class="text-gray-500 text-sm text-center py-8">No activity yet. Start by adding items, activities, or expenses!</p>
	{:else}
		<ul class="space-y-3">
			{#each entries as entry (entry.id)}
				{@const Icon = iconMap[entry.actionType] ?? Target}
				{@const colors = colorMap[entry.actionType] ?? 'text-gray-500 bg-gray-100'}
				<li class="flex items-start gap-3">
					<span class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center {colors}">
						<Icon size={15} />
					</span>
					<div class="flex-1 min-w-0">
						<p class="text-sm text-gray-800">
							<span class="font-semibold">{entry.userName}</span>
							{' '}{entry.message}
						</p>
						<p class="text-xs text-gray-400 mt-0.5">{timeAgo(entry.createdAt)}</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
