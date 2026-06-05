import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, inviteId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const tripInvites = await getCollection('tripInvites');
		await tripInvites.deleteOne({ _id: new ObjectId(inviteId), tripId: new ObjectId(tripId) });

		return json({ success: true });
	} catch (error) {
		console.error('Error canceling invite:', error);
		return json({ success: false, error: 'Failed to cancel invite' }, { status: 500 });
	}
}
