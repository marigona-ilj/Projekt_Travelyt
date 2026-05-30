import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ cookies }) {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const trips = await getCollection('trips');
		const logs = await getCollection('tripActivityLog');

		const memberships = await tripMembers
			.find({ userId: new ObjectId(userId) })
			.toArray();

		const tripIds = memberships.map((m) => m.tripId);

		if (tripIds.length === 0) {
			return json({ success: true, entries: [] });
		}

		const tripList = await trips.find({ _id: { $in: tripIds } }).toArray();
		const tripNameMap = Object.fromEntries(
			tripList.map((t) => [t._id.toString(), t.title])
		);

		const entries = await logs
			.find({ tripId: { $in: tripIds } })
			.sort({ createdAt: -1 })
			.limit(50)
			.toArray();

		return json({
			success: true,
			entries: entries.map((e) => ({
				id: e._id.toString(),
				tripId: e.tripId.toString(),
				tripName: tripNameMap[e.tripId.toString()] || 'Unknown trip',
				userName: e.userName,
				actionType: e.actionType,
				message: e.message,
				createdAt: e.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching global feed:', error);
		return json({ success: false, error: 'Failed to fetch feed' }, { status: 500 });
	}
}
