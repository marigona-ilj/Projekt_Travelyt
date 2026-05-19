import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const logs = await getCollection('tripActivityLog');
		const entries = await logs
			.find({ tripId: new ObjectId(tripId) })
			.sort({ createdAt: -1 })
			.limit(50)
			.toArray();

		return json({
			success: true,
			entries: entries.map((e) => ({
				id: e._id.toString(),
				userName: e.userName,
				actionType: e.actionType,
				message: e.message,
				createdAt: e.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching feed:', error);
		return json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
	}
}
