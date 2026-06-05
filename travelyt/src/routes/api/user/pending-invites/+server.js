import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// GET: pending trip invites for the current user
export async function GET({ cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const usersCol = await getCollection('users');
		const user = await usersCol.findOne({ _id: new ObjectId(userId) });
		if (!user) return json({ success: false, error: 'User not found' }, { status: 404 });

		const tripInvites = await getCollection('tripInvites');
		const trips = await getCollection('trips');

		const invites = await tripInvites.find({ email: user.email.toLowerCase() }).toArray();
		if (invites.length === 0) return json({ success: true, invites: [] });

		const tripIds = invites.map((i) => i.tripId);
		const tripDocs = await trips.find({ _id: { $in: tripIds } }).toArray();
		const tripMap = Object.fromEntries(tripDocs.map((t) => [t._id.toString(), t]));

		const result = invites.map((inv) => {
			const trip = tripMap[inv.tripId.toString()];
			return {
				inviteId: inv._id.toString(),
				tripId: inv.tripId.toString(),
				tripTitle: trip?.title ?? 'Unknown trip',
				tripDestination: trip?.destination ?? '',
				tripStartDate: trip?.startDate ?? null,
				tripEndDate: trip?.endDate ?? null
			};
		});

		return json({ success: true, invites: result });
	} catch (error) {
		console.error('Error fetching pending invites:', error);
		return json({ success: false, error: 'Failed to fetch invites' }, { status: 500 });
	}
}

// POST: accept an invite (join the trip)
export async function POST({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { inviteId } = await request.json();
		const tripInvites = await getCollection('tripInvites');
		const invite = await tripInvites.findOne({ _id: new ObjectId(inviteId) });
		if (!invite) return json({ success: false, error: 'Invite not found' }, { status: 404 });

		const tripMembers = await getCollection('tripMembers');
		const alreadyMember = await tripMembers.findOne({
			tripId: invite.tripId,
			userId: new ObjectId(userId)
		});

		if (!alreadyMember) {
			await tripMembers.insertOne({
				tripId: invite.tripId,
				userId: new ObjectId(userId),
				role: 'member',
				joinedAt: new Date()
			});
		}

		await tripInvites.deleteOne({ _id: new ObjectId(inviteId) });
		return json({ success: true, tripId: invite.tripId.toString() });
	} catch (error) {
		console.error('Error accepting invite:', error);
		return json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
	}
}

// DELETE: decline an invite
export async function DELETE({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { inviteId } = await request.json();
		const tripInvites = await getCollection('tripInvites');
		await tripInvites.deleteOne({ _id: new ObjectId(inviteId) });
		return json({ success: true });
	} catch (error) {
		console.error('Error declining invite:', error);
		return json({ success: false, error: 'Failed to decline invite' }, { status: 500 });
	}
}
