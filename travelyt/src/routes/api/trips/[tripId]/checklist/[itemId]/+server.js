import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({ tripId: new ObjectId(tripId), userId: new ObjectId(userId) });
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const body = await request.json();
		const checklist = await getCollection('tripChecklist');
		const item = await checklist.findOne({ _id: new ObjectId(itemId), tripId: new ObjectId(tripId) });
		if (!item) return json({ success: false, error: 'Item not found' }, { status: 404 });

		let update;
		if (body.checked !== undefined) {
			if (item.isPersonal) {
				update = body.checked
					? { $addToSet: { checkedBy: new ObjectId(userId) }, $set: { updatedAt: new Date() } }
					: { $pull: { checkedBy: new ObjectId(userId) }, $set: { updatedAt: new Date() } };
			} else {
				update = { $set: { checked: body.checked, updatedAt: new Date() } };
			}
		} else if (body.text !== undefined) {
			update = { $set: { text: body.text.trim(), updatedAt: new Date() } };
		}

		if (update) await checklist.updateOne({ _id: new ObjectId(itemId) }, update);

		return json({ success: true });
	} catch (error) {
		console.error('Error updating checklist item:', error);
		return json({ success: false, error: 'Failed to update item' }, { status: 500 });
	}
}

export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, itemId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({ tripId: new ObjectId(tripId), userId: new ObjectId(userId) });
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const checklist = await getCollection('tripChecklist');
		await checklist.deleteOne({ _id: new ObjectId(itemId), tripId: new ObjectId(tripId) });

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting checklist item:', error);
		return json({ success: false, error: 'Failed to delete item' }, { status: 500 });
	}
}
