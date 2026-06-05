import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// Returns all users the current user has shared a trip with (excluding self)
export async function GET({ cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const usersCol = await getCollection('users');

		// All trips the current user is part of
		const myMemberships = await tripMembers.find({ userId: new ObjectId(userId) }).toArray();
		const tripIds = myMemberships.map((m) => m.tripId);

		if (tripIds.length === 0) {
			return json({ success: true, contacts: [] });
		}

		// All members across those trips, excluding self
		const coMembers = await tripMembers
			.find({
				tripId: { $in: tripIds },
				userId: { $ne: new ObjectId(userId) }
			})
			.toArray();

		// Unique userIds
		const seenIds = new Set();
		const uniqueIds = [];
		for (const m of coMembers) {
			const key = m.userId.toString();
			if (!seenIds.has(key)) {
				seenIds.add(key);
				uniqueIds.push(m.userId);
			}
		}

		if (uniqueIds.length === 0) {
			return json({ success: true, contacts: [] });
		}

		const users = await usersCol.find({ _id: { $in: uniqueIds } }).toArray();

		return json({
			success: true,
			contacts: users.map((u) => ({
				userId: u._id.toString(),
				name: u.name,
				email: u.email
			}))
		});
	} catch (error) {
		console.error('Error fetching contacts:', error);
		return json({ success: false, error: 'Failed to fetch contacts' }, { status: 500 });
	}
}
