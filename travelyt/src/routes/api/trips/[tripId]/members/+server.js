import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

// Get trip members + pending invites
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const users = await getCollection('users');
		const tripInvites = await getCollection('tripInvites');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const members = await tripMembers.find({ tripId: new ObjectId(tripId) }).toArray();
		const memberData = await Promise.all(
			members.map(async (member) => {
				const user = await users.findOne({ _id: member.userId });
				return {
					userId: member.userId.toString(),
					name: user?.name || 'Unknown',
					email: user?.email || '',
					role: member.role,
					joinedAt: member.joinedAt
				};
			})
		);

		const pending = await tripInvites.find({ tripId: new ObjectId(tripId) }).toArray();
		const pendingInvites = pending.map((inv) => ({
			id: inv._id.toString(),
			email: inv.email
		}));

		return json({ success: true, members: memberData, pendingInvites });
	} catch (error) {
		console.error('Error fetching members:', error);
		return json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
	}
}

// Add member by email — creates pending invite if user doesn't exist yet
export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const users = await getCollection('users');
		const tripInvites = await getCollection('tripInvites');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const { email } = await request.json();
		const normalizedEmail = email.trim().toLowerCase();

		const invitedUser = await users.findOne({ email: normalizedEmail });

		if (!invitedUser) {
			// Check not already pending
			const alreadyPending = await tripInvites.findOne({
				tripId: new ObjectId(tripId),
				email: normalizedEmail
			});
			if (alreadyPending) {
				return json({ success: false, error: 'An invitation for this email is already pending.' }, { status: 400 });
			}
			// Store pending invite
			await tripInvites.insertOne({
				tripId: new ObjectId(tripId),
				email: normalizedEmail,
				invitedBy: new ObjectId(userId),
				createdAt: new Date()
			});
			return json({
				success: true,
				pending: true,
				message: `No account found for ${normalizedEmail}. They'll be added automatically when they sign up.`
			}, { status: 201 });
		}

		// User exists — check not already a member
		const existingMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: invitedUser._id
		});
		if (existingMember) {
			return json({ success: false, error: 'This person is already a member.' }, { status: 400 });
		}

		await tripMembers.insertOne({
			tripId: new ObjectId(tripId),
			userId: invitedUser._id,
			role: 'member',
			joinedAt: new Date()
		});

		const inviterName = await getUserName(userId);
		await logActivity(tripId, userId, inviterName, 'member_added', `invited ${invitedUser.name} to the trip`);

		return json({ success: true, pending: false, message: `${invitedUser.name} added to trip` }, { status: 201 });
	} catch (error) {
		console.error('Error adding member:', error);
		return json({ success: false, error: 'Failed to add member' }, { status: 500 });
	}
}

// Remove member
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, memberId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');

		const isOwner = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId),
			role: 'owner'
		});
		if (!isOwner) return json({ success: false, error: 'Only the owner can remove members' }, { status: 403 });

		await tripMembers.deleteOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(memberId)
		});

		return json({ success: true });
	} catch (error) {
		console.error('Error removing member:', error);
		return json({ success: false, error: 'Failed to remove member' }, { status: 500 });
	}
}
