import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

// Remove member from trip
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, memberId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		// Check if user is owner
		const trip = await trips.findOne({ _id: new ObjectId(tripId) });
		if (!trip || trip.createdBy.toString() !== userId) {
			return json({ success: false, error: 'Only owner can remove members' }, { status: 403 });
		}

		// Cannot remove owner
		if (memberId === userId) {
			return json({ success: false, error: 'Cannot remove trip owner' }, { status: 400 });
		}

		const users = await getCollection('users');
		const removedUser = await users.findOne({ _id: new ObjectId(memberId) }, { projection: { name: 1 } });

		const result = await tripMembers.deleteOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(memberId)
		});

		if (result.deletedCount === 0) {
			return json({ success: false, error: 'Member not found' }, { status: 404 });
		}

		const ownerName = await getUserName(userId);
		await logActivity(
			tripId,
			userId,
			ownerName,
			'member_removed',
			`removed ${removedUser?.name || 'a member'} from the trip`
		);

		return json({ success: true, message: 'Member removed' });
	} catch (error) {
		console.error('Error removing member:', error);
		return json({ success: false, error: 'Failed to remove member' }, { status: 500 });
	}
}
