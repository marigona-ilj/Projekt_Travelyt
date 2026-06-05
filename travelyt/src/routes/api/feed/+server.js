import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

const PREF_DEFAULTS = {
	member_changes: true,
	expenses: true,
	activities: true,
	chat: true,
	photos: true,
	packing: true
};

const ACTION_TO_PREF = {
	member_added: 'member_changes',
	member_removed: 'member_changes',
	expense_added: 'expenses',
	expense_updated: 'expenses',
	expense_deleted: 'expenses',
	activity_added: 'activities',
	activity_updated: 'activities',
	activity_deleted: 'activities',
	chat_message: 'chat',
	photo_added: 'photos',
	photo_deleted: 'photos',
	packing_added: 'packing',
	packing_deleted: 'packing'
};

export async function GET({ cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const trips = await getCollection('trips');
		const logs = await getCollection('tripActivityLog');
		const users = await getCollection('users');

		const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { notificationPrefs: 1 } });
		const prefs = { ...PREF_DEFAULTS, ...(user?.notificationPrefs ?? {}) };

		const memberships = await tripMembers.find({ userId: new ObjectId(userId) }).toArray();
		const tripIds = memberships.map((m) => m.tripId);

		if (tripIds.length === 0) return json({ success: true, entries: [] });

		const tripList = await trips.find({ _id: { $in: tripIds } }).toArray();
		const tripNameMap = Object.fromEntries(tripList.map((t) => [t._id.toString(), t.title]));

		const entries = await logs
			.find({ tripId: { $in: tripIds } })
			.sort({ createdAt: -1 })
			.limit(200)
			.toArray();

		const filtered = entries
			.filter((e) => {
				// Never show your own chat messages
				if (e.actionType === 'chat_message' && e.userId.toString() === userId) return false;
				// Apply notification preferences
				const pref = ACTION_TO_PREF[e.actionType];
				if (pref && !prefs[pref]) return false;
				return true;
			})
			.slice(0, 50);

		return json({
			success: true,
			entries: filtered.map((e) => ({
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
