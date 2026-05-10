import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// Any trip member can toggle packed. Private items are invisible to non-owners so
// they can only be toggled by the owner in practice.
export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const body = await request.json();

		// Only the creator can rename/recategorise; anyone can toggle packed
		if (body.item !== undefined || body.category !== undefined) {
			const item = await packingItems.findOne({
				_id: new ObjectId(itemId),
				tripId: new ObjectId(tripId)
			});
			if (!item) {
				return json({ success: false, error: 'Item not found' }, { status: 404 });
			}
			if (item.createdBy && item.createdBy.toString() !== userId) {
				return json({ success: false, error: 'You can only edit your own items' }, { status: 403 });
			}
		}

		const $set = { updatedAt: new Date() };
		if (body.packed !== undefined) $set.packed = body.packed;
		if (body.item !== undefined) $set.item = body.item;
		if (body.category !== undefined) $set.category = body.category;

		const result = await packingItems.updateOne(
			{ _id: new ObjectId(itemId), tripId: new ObjectId(tripId) },
			{ $set }
		);

		if (result.matchedCount === 0) {
			return json({ success: false, error: 'Item not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Item updated' });
	} catch (error) {
		console.error('Error updating packing item:', error);
		return json({ success: false, error: 'Failed to update item' }, { status: 500 });
	}
}

// Only the item creator can delete their item
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const item = await packingItems.findOne({
			_id: new ObjectId(itemId),
			tripId: new ObjectId(tripId)
		});

		if (!item) {
			return json({ success: false, error: 'Item not found' }, { status: 404 });
		}

		// If item has an owner, only they can delete it
		if (item.createdBy && item.createdBy.toString() !== userId) {
			return json({ success: false, error: 'You can only delete your own items' }, { status: 403 });
		}

		await packingItems.deleteOne({ _id: new ObjectId(itemId) });

		return json({ success: true, message: 'Item deleted' });
	} catch (error) {
		console.error('Error deleting packing item:', error);
		return json({ success: false, error: 'Failed to delete item' }, { status: 500 });
	}
}
