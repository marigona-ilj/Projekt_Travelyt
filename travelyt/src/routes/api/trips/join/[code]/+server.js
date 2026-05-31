import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// Get trip info for the join page
export async function GET({ params }) {
	const { code } = params;

	try {
		const trips = await getCollection('trips');
		const trip = await trips.findOne({ inviteCode: code });

		if (!trip) return json({ success: false, error: 'Invalid or expired invite link' }, { status: 404 });

		return json({
			success: true,
			trip: { id: trip._id.toString(), title: trip.title, destination: trip.destination }
		});
	} catch (error) {
		console.error('Error fetching invite trip:', error);
		return json({ success: false, error: 'Failed to load trip' }, { status: 500 });
	}
}

// Join the trip
export async function POST({ params, cookies }) {
	const userId = cookies.get('userId');
	const { code } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const trips = await getCollection('trips');
		const trip = await trips.findOne({ inviteCode: code });

		if (!trip) return json({ success: false, error: 'Invalid or expired invite link' }, { status: 404 });

		const tripMembers = await getCollection('tripMembers');
		const alreadyMember = await tripMembers.findOne({
			tripId: trip._id,
			userId: new ObjectId(userId)
		});

		if (alreadyMember) {
			return json({ success: true, tripId: trip._id.toString(), alreadyMember: true });
		}

		const users = await getCollection('users');
		const user = await users.findOne({ _id: new ObjectId(userId) });

		await tripMembers.insertOne({
			tripId: trip._id,
			userId: new ObjectId(userId),
			name: user?.name || 'Unknown',
			email: user?.email || '',
			role: 'member',
			joinedAt: new Date()
		});

		return json({ success: true, tripId: trip._id.toString() });
	} catch (error) {
		console.error('Error joining trip:', error);
		return json({ success: false, error: 'Failed to join trip' }, { status: 500 });
	}
}
