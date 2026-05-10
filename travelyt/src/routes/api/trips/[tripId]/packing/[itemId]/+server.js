import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// Update packing item (mark as packed/unpacked)
export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const { packed } = await request.json();

		const result = await packingItems.updateOne(
			{ _id: new ObjectId(itemId), tripId: new ObjectId(tripId) },
			{ $set: { packed: packed || false, updatedAt: new Date() } }
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

// Delete packing item
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const result = await packingItems.deleteOne({
			_id: new ObjectId(itemId),
			tripId: new ObjectId(tripId)
		});

		if (result.deletedCount === 0) {
			return json({ success: false, error: 'Item not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Item deleted' });
	} catch (error) {
		console.error('Error deleting packing item:', error);
		return json({ success: false, error: 'Failed to delete item' }, { status: 500 });
	}
}
