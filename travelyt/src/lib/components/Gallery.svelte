<script>
	import { onMount } from 'svelte';
	import { ImagePlus, Trash2, X, Download, CheckSquare, Square } from 'lucide-svelte';

	let { tripId, currentUserId } = $props();

	let photos = $state([]);
	let loading = $state(true);
	let error = $state('');
	let uploading = $state(false);
	let lightboxPhoto = $state(null);
	let selectMode = $state(false);
	let selectedIds = $state(new Set());

	let allSelected = $derived(photos.length > 0 && selectedIds.size === photos.length);
	let selectedOwnCount = $derived(
		photos.filter((p) => selectedIds.has(p.id) && p.uploadedBy === currentUserId).length
	);

	onMount(async () => await fetchPhotos());

	async function fetchPhotos() {
		try {
			const res = await fetch(`/api/trips/${tripId}/gallery`);
			const data = await res.json();
			if (data.success) photos = data.photos;
			else error = data.error || 'Failed to load photos';
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}

	function handleFileSelect(event) {
		const file = event.target.files[0];
		if (!file) return;
		if (file.size > 5 * 1024 * 1024) {
			error = 'Image must be under 5 MB';
			event.target.value = '';
			return;
		}
		error = '';
		const reader = new FileReader();
		reader.onload = async (e) => await uploadPhoto(e.target.result);
		reader.readAsDataURL(file);
		event.target.value = '';
	}

	async function uploadPhoto(base64) {
		uploading = true;
		try {
			const res = await fetch(`/api/trips/${tripId}/gallery`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ image: base64 })
			});
			const data = await res.json();
			if (data.success) await fetchPhotos();
			else error = data.error || 'Failed to upload';
		} catch {
			error = 'Network error';
		} finally {
			uploading = false;
		}
	}

	async function deletePhoto(id) {
		if (!confirm('Dieses Foto wirklich löschen?')) return;
		try {
			const res = await fetch(`/api/trips/${tripId}/gallery/${id}`, { method: 'DELETE' });
			const data = await res.json();
			if (data.success) {
				if (lightboxPhoto?.id === id) lightboxPhoto = null;
				selectedIds.delete(id);
				selectedIds = new Set(selectedIds);
				await fetchPhotos();
			} else {
				error = data.error || 'Failed to delete';
			}
		} catch {
			error = 'Network error';
		}
	}

	function getExtension(base64) {
		if (base64.startsWith('data:image/png')) return 'png';
		if (base64.startsWith('data:image/gif')) return 'gif';
		if (base64.startsWith('data:image/webp')) return 'webp';
		return 'jpg';
	}

	function downloadPhoto(photo) {
		const a = document.createElement('a');
		a.href = photo.image;
		a.download = `trip-photo-${photo.id}.${getExtension(photo.image)}`;
		a.click();
	}

	async function downloadSelected() {
		const toDownload = photos.filter((p) => selectedIds.has(p.id));
		for (const photo of toDownload) {
			downloadPhoto(photo);
			await new Promise((r) => setTimeout(r, 200));
		}
	}

	async function deleteSelected() {
		const toDelete = photos.filter((p) => selectedIds.has(p.id) && p.uploadedBy === currentUserId);
		if (toDelete.length === 0) return;
		if (!confirm(`${toDelete.length} Foto${toDelete.length > 1 ? 's' : ''} wirklich löschen?`)) return;
		for (const photo of toDelete) {
			try {
				const res = await fetch(`/api/trips/${tripId}/gallery/${photo.id}`, { method: 'DELETE' });
				const data = await res.json();
				if (!data.success) error = data.error || 'Failed to delete';
			} catch {
				error = 'Network error';
			}
		}
		selectedIds = new Set();
		await fetchPhotos();
		if (photos.length === 0) exitSelectMode();
	}

	function toggleSelect(id) {
		const next = new Set(selectedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedIds = next;
	}

	function toggleSelectAll() {
		if (allSelected) selectedIds = new Set();
		else selectedIds = new Set(photos.map((p) => p.id));
	}

	function exitSelectMode() {
		selectMode = false;
		selectedIds = new Set();
	}

	function openLightbox(photo) {
		if (!selectMode) lightboxPhoto = photo;
		else toggleSelect(photo.id);
	}

	function closeLightbox() {
		lightboxPhoto = null;
	}
</script>

<div>
	<!-- Header -->
	<div class="flex justify-between items-center mb-6">
		<h2 class="text-2xl font-bold text-gray-800">Gallery</h2>
		<div class="flex gap-2">
			{#if selectMode}
				<button
					onclick={toggleSelectAll}
					class="flex items-center gap-1 text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
				>
					{#if allSelected}
						<CheckSquare size={15} /> Deselect all
					{:else}
						<Square size={15} /> Select all
					{/if}
				</button>
				<button
					onclick={downloadSelected}
					disabled={selectedIds.size === 0}
					class="flex items-center gap-1 text-sm px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white"
				>
					<Download size={15} /> Download ({selectedIds.size})
				</button>
				{#if selectedOwnCount > 0}
					<button
						onclick={deleteSelected}
						class="flex items-center gap-1 text-sm px-3 py-1 rounded bg-red-500 hover:bg-red-600 text-white"
					>
						<Trash2 size={15} /> Delete ({selectedOwnCount})
					</button>
				{/if}
				<button
					onclick={exitSelectMode}
					class="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700"
				>
					Cancel
				</button>
			{:else}
				{#if photos.length > 0}
					<button
						onclick={() => (selectMode = true)}
						class="text-sm px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
					>
						Select
					</button>
				{/if}
				<label class="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm cursor-pointer flex items-center gap-1 {uploading ? 'opacity-60 pointer-events-none' : ''}">
					<ImagePlus size={15} />
					{uploading ? 'Uploading...' : 'Upload Photo'}
					<input type="file" accept="image/*" onchange={handleFileSelect} class="hidden" disabled={uploading} />
				</label>
			{/if}
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
	{/if}

	{#if loading}
		<p class="text-gray-600">Loading photos...</p>
	{:else if photos.length === 0}
		<div class="text-center py-16 text-gray-400">
			<ImagePlus size={48} class="mx-auto mb-3 opacity-30" />
			<p class="text-lg font-medium">No photos yet</p>
			<p class="text-sm mt-1">Be the first to upload a photo from this trip!</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
			{#each photos as photo}
				<div
					class="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square cursor-pointer"
					onclick={() => openLightbox(photo)}
				>
					<img
						src={photo.image}
						alt="Trip photo"
						class="w-full h-full object-cover transition {selectMode && selectedIds.has(photo.id) ? 'opacity-75' : 'hover:opacity-90'}"
					/>

					<!-- Select mode overlay -->
					{#if selectMode}
						<div class="absolute inset-0 flex items-center justify-center">
							{#if selectedIds.has(photo.id)}
								<div class="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shadow">
									<CheckSquare size={16} class="text-white" />
								</div>
							{:else}
								<div class="w-7 h-7 rounded-full bg-white/80 flex items-center justify-center shadow">
									<Square size={16} class="text-gray-500" />
								</div>
							{/if}
						</div>
					{:else}
						{#if photo.uploadedBy === currentUserId}
							<button
								onclick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
								class="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
							>
								<Trash2 size={13} />
							</button>
						{/if}
						<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1 opacity-0 group-hover:opacity-100 transition">
							<p class="text-white text-xs truncate">{photo.uploaderName}</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Lightbox -->
{#if lightboxPhoto}
	<div
		class="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
		onclick={closeLightbox}
	>
		<div
			class="relative max-w-4xl w-full"
			onclick={(e) => e.stopPropagation()}
		>
			<img
				src={lightboxPhoto.image}
				alt="Trip photo"
				class="max-h-[80vh] w-full object-contain rounded-lg"
			/>
			<div class="flex justify-between items-center mt-3">
				<p class="text-white text-sm">{lightboxPhoto.uploaderName}</p>
				<div class="flex gap-2">
					<button
						onclick={() => downloadPhoto(lightboxPhoto)}
						class="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded flex items-center gap-1"
					>
						<Download size={14} /> Download
					</button>
					{#if lightboxPhoto.uploadedBy === currentUserId}
						<button
							onclick={() => deletePhoto(lightboxPhoto.id)}
							class="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded flex items-center gap-1"
						>
							<Trash2 size={14} /> Delete
						</button>
					{/if}
					<button
						onclick={closeLightbox}
						class="bg-gray-600 hover:bg-gray-700 text-white text-sm py-1 px-3 rounded flex items-center gap-1"
					>
						<X size={14} /> Close
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
