import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { getUserById } from '$lib/server/auth.js';

// Get trip members
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const users = await getCollection('users');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const members = await tripMembers
			.find({ tripId: new ObjectId(tripId) })
			.toArray();

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

		return json({
			success: true,
			members: memberData
		});
	} catch (error) {
		console.error('Error fetching members:', error);
		return json({ success: false, error: 'Failed to fetch members' }, { status: 500 });
	}
}

// Add member to trip (invite by email)
export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const users = await getCollection('users');

		// Any trip member can invite others
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const { email } = await request.json();

		// Find user by email
		const invitedUser = await users.findOne({ email });
		if (!invitedUser) {
			return json({ success: false, error: 'User not found' }, { status: 404 });
		}

		// Check if already member
		const existingMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: invitedUser._id
		});

		if (existingMember) {
			return json({ success: false, error: 'User is already a member' }, { status: 400 });
		}

		// Add member
		await tripMembers.insertOne({
			tripId: new ObjectId(tripId),
			userId: invitedUser._id,
			role: 'member',
			joinedAt: new Date()
		});

		return json(
			{
				success: true,
				message: `${invitedUser.name} added to trip`
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error adding member:', error);
		return json({ success: false, error: 'Failed to add member' }, { status: 500 });
	}
}
