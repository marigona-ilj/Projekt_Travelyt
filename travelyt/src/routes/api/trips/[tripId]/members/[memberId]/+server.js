import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

// Transfer ownership to this member
export async function PATCH({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, memberId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	if (memberId === userId) return json({ success: false, error: 'You are already the owner' }, { status: 400 });

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		const trip = await trips.findOne({ _id: new ObjectId(tripId) });
		if (!trip) return json({ success: false, error: 'Trip not found' }, { status: 404 });
		if (trip.createdBy.toString() !== userId) {
			return json({ success: false, error: 'Only the owner can transfer ownership' }, { status: 403 });
		}

		const newOwnerMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(memberId)
		});
		if (!newOwnerMember) return json({ success: false, error: 'Member not found' }, { status: 404 });

		await Promise.all([
			trips.updateOne({ _id: new ObjectId(tripId) }, { $set: { createdBy: new ObjectId(memberId) } }),
			tripMembers.updateOne(
				{ tripId: new ObjectId(tripId), userId: new ObjectId(memberId) },
				{ $set: { role: 'owner' } }
			),
			tripMembers.updateOne(
				{ tripId: new ObjectId(tripId), userId: new ObjectId(userId) },
				{ $set: { role: 'member' } }
			)
		]);

		const actorName = await getUserName(userId);
		const users = await getCollection('users');
		const newOwner = await users.findOne({ _id: new ObjectId(memberId) }, { projection: { name: 1 } });
		await logActivity(tripId, userId, actorName, 'member_added', `transferred ownership to ${newOwner?.name || 'a member'}`);

		return json({ success: true });
	} catch (error) {
		console.error('Error transferring ownership:', error);
		return json({ success: false, error: 'Failed to transfer ownership' }, { status: 500 });
	}
}

export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, memberId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		const trip = await trips.findOne({ _id: new ObjectId(tripId) });
		if (!trip) return json({ success: false, error: 'Trip not found' }, { status: 404 });

		const isSelf = memberId === userId;
		const isOwner = trip.createdBy.toString() === userId;

		if (!isSelf && !isOwner) {
			return json({ success: false, error: 'Only the owner can remove other members' }, { status: 403 });
		}

		// Owner leaving → transfer ownership first
		if (isSelf && isOwner) {
			const others = await tripMembers
				.find({ tripId: new ObjectId(tripId), userId: { $ne: new ObjectId(userId) } })
				.sort({ joinedAt: 1 })
				.toArray();

			if (others.length === 0) {
				return json({ success: false, error: 'You are the only member. Delete the trip instead.' }, { status: 400 });
			}

			const newOwner = others[0];

			await Promise.all([
				trips.updateOne(
					{ _id: new ObjectId(tripId) },
					{ $set: { createdBy: newOwner.userId } }
				),
				tripMembers.updateOne(
					{ tripId: new ObjectId(tripId), userId: newOwner.userId },
					{ $set: { role: 'owner' } }
				)
			]);
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

		const actorName = await getUserName(userId);
		const message = isSelf
			? 'left the trip'
			: `removed ${removedUser?.name || 'a member'} from the trip`;
		await logActivity(tripId, userId, actorName, 'member_removed', message);

		return json({ success: true, message: isSelf ? 'You have left the trip' : 'Member removed' });
	} catch (error) {
		console.error('Error removing member:', error);
		return json({ success: false, error: 'Failed to remove member' }, { status: 500 });
	}
}
