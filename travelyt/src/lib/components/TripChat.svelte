<script>
	import { MessageCircle, X, Send } from 'lucide-svelte';
	import { tick, onMount } from 'svelte';

	let { tripId, currentUserId, currentUserName } = $props();

	let open = $state(false);
	let messages = $state([]);
	let newMessage = $state('');
	let sending = $state(false);
	let loading = $state(false);
	let messagesEl = $state(null);
	let lastSeenTime = $state(new Date().toISOString());

	let unreadCount = $derived(
		messages.filter(
			(m) => m.userId !== currentUserId && new Date(m.createdAt) > new Date(lastSeenTime)
		).length
	);

	async function fetchMessages() {
		try {
			const res = await fetch(`/api/trips/${tripId}/messages`);
			const data = await res.json();
			if (data.success) messages = data.messages;
		} catch {}
	}

	function markAsSeen() {
		const now = new Date().toISOString();
		try { localStorage.setItem(`chat_seen_${tripId}`, now); } catch {}
		lastSeenTime = now;
	}

	function scrollToBottom() {
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	}

	onMount(() => {
		try {
			const stored = localStorage.getItem(`chat_seen_${tripId}`);
			if (stored) lastSeenTime = stored;
		} catch {}
		fetchMessages();
		const bg = setInterval(() => { if (!open) fetchMessages(); }, 8000);
		return () => clearInterval(bg);
	});

	$effect(() => {
		if (!open) return;
		loading = true;
		fetchMessages().then(() => {
			loading = false;
			markAsSeen();
			scrollToBottom();
		});
		const interval = setInterval(async () => {
			await fetchMessages();
			markAsSeen();
		}, 5000);
		return () => clearInterval(interval);
	});

	async function sendMessage(event) {
		if (event?.preventDefault) event.preventDefault();
		const text = newMessage.trim();
		if (!text || sending) return;
		sending = true;
		try {
			const res = await fetch(`/api/trips/${tripId}/messages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text, userName: currentUserName })
			});
			const data = await res.json();
			if (data.success) {
				newMessage = '';
				messages = [...messages, data.message];
				markAsSeen();
				scrollToBottom();
			}
		} catch {
		} finally {
			sending = false;
		}
	}

	function formatTime(date) {
		return new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	function formatDay(date) {
		const d = new Date(date);
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(today.getDate() - 1);
		if (d.toDateString() === today.toDateString()) return 'Today';
		if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	let items = $derived.by(() => {
		const result = [];
		let currentDay = null;
		let prevSenderId = null;
		for (const msg of messages) {
			const day = new Date(msg.createdAt).toDateString();
			if (day !== currentDay) {
				currentDay = day;
				prevSenderId = null;
				result.push({ type: 'date', label: formatDay(msg.createdAt) });
			}
			const isOwn = msg.userId === currentUserId;
			result.push({
				type: 'message',
				...msg,
				isOwn,
				showName: !isOwn && msg.userId !== prevSenderId
			});
			prevSenderId = msg.userId;
		}
		return result;
	});
</script>

<!-- Floating button -->
<div class="fixed bottom-6 right-6 z-50">
	<button
		onclick={() => (open = !open)}
		class="relative w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
		aria-label={open ? 'Close chat' : 'Open chat'}
	>
		{#if !open && unreadCount > 0}
			<span class="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-60"></span>
		{/if}
		{#if open}
			<X size={22} />
		{:else}
			<MessageCircle size={22} />
		{/if}
		{#if !open && unreadCount > 0}
			<span class="absolute top-0.5 right-0.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none px-1">
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</button>
</div>

<!-- Chat panel -->
{#if open}
	<div
		class="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
		style="height: 480px"
	>
		<!-- Header -->
		<div class="bg-blue-600 px-4 py-3 flex items-center justify-between shrink-0">
			<div class="flex items-center gap-2">
				<MessageCircle size={17} class="text-white" />
				<span class="font-semibold text-white text-sm">Trip Chat</span>
			</div>
			<button onclick={() => (open = false)} class="text-white/70 hover:text-white transition-colors">
				<X size={18} />
			</button>
		</div>

		<!-- Messages -->
		<div bind:this={messagesEl} class="flex-1 overflow-y-auto px-3 py-3 space-y-1">
			{#if loading && messages.length === 0}
				<div class="flex items-center justify-center h-full">
					<p class="text-gray-400 dark:text-gray-500 text-sm">Loading...</p>
				</div>
			{:else if messages.length === 0}
				<div class="flex items-center justify-center h-full text-center">
					<p class="text-gray-400 dark:text-gray-500 text-sm">
						No messages yet.<br />Be the first to say something!
					</p>
				</div>
			{:else}
				{#each items as item (item.type === 'date' ? item.label : item.id)}
					{#if item.type === 'date'}
						<div class="flex items-center gap-2 py-2">
							<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
							<span class="text-[11px] text-gray-400 dark:text-gray-500 px-1 whitespace-nowrap"
								>{item.label}</span
							>
							<div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
						</div>
					{:else if item.isOwn}
						<div class="flex flex-col items-end">
							<div
								class="max-w-[78%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3 py-2"
							>
								<p class="text-sm break-words leading-relaxed">{item.text}</p>
							</div>
							<span class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 mr-1"
								>{formatTime(item.createdAt)}</span
							>
						</div>
					{:else}
						<div class="flex flex-col items-start">
							{#if item.showName}
								<span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 ml-1 mb-0.5"
									>{item.userName}</span
								>
							{/if}
							<div
								class="max-w-[78%] bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm px-3 py-2"
							>
								<p class="text-sm break-words leading-relaxed">{item.text}</p>
							</div>
							<span class="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1"
								>{formatTime(item.createdAt)}</span
							>
						</div>
					{/if}
				{/each}
			{/if}
		</div>

		<!-- Input -->
		<div class="border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
			<form onsubmit={sendMessage} class="flex gap-2 items-center">
				<input
					type="text"
					bind:value={newMessage}
					placeholder="Type a message..."
					disabled={sending}
					class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<button
					type="submit"
					disabled={!newMessage.trim() || sending}
					class="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full flex items-center justify-center shrink-0 transition-colors"
				>
					<Send size={15} />
				</button>
			</form>
		</div>
	</div>
{/if}
