import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

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

		// For private items, only the creator can edit
		if (body.item !== undefined || body.category !== undefined) {
			const item = await packingItems.findOne({
				_id: new ObjectId(itemId),
				tripId: new ObjectId(tripId)
			});
			if (!item) {
				return json({ success: false, error: 'Item not found' }, { status: 404 });
			}
			if (item.isPrivate && item.createdBy && item.createdBy.toString() !== userId) {
				return json({ success: false, error: 'You can only edit your own private items' }, { status: 403 });
			}
		}

		const setFields = { updatedAt: new Date() };
		if (body.item !== undefined) setFields.item = body.item;
		if (body.category !== undefined) setFields.category = body.category;

		const updateDoc = { $set: setFields };
		if (body.packed !== undefined) {
			if (body.packed) {
				updateDoc.$addToSet = { packedBy: new ObjectId(userId) };
			} else {
				updateDoc.$pull = { packedBy: new ObjectId(userId) };
			}
		}

		const result = await packingItems.updateOne(
			{ _id: new ObjectId(itemId), tripId: new ObjectId(tripId) },
			updateDoc
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

		// For private items, only the creator can delete
		if (item.isPrivate && item.createdBy && item.createdBy.toString() !== userId) {
			return json({ success: false, error: 'You can only delete your own private items' }, { status: 403 });
		}

		await packingItems.deleteOne({ _id: new ObjectId(itemId) });

		if (!item.isPrivate) {
			const userName = await getUserName(userId);
			await logActivity(tripId, userId, userName, 'packing_deleted', `removed ${item.item} from the packing list`);
		}

		return json({ success: true, message: 'Item deleted' });
	} catch (error) {
		console.error('Error deleting packing item:', error);
		return json({ success: false, error: 'Failed to delete item' }, { status: 500 });
	}
}
