import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity } from '$lib/server/activityLog.js';

async function isTripMember(tripId, userId) {
	const tripMembers = await getCollection('tripMembers');
	return tripMembers.findOne({
		tripId: new ObjectId(tripId),
		userId: new ObjectId(userId)
	});
}

export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		if (!(await isTripMember(tripId, userId))) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const messages = await getCollection('messages');
		const msgs = await messages
			.find({ tripId: new ObjectId(tripId) })
			.sort({ createdAt: 1 })
			.limit(200)
			.toArray();

		return json({
			success: true,
			messages: msgs.map((m) => ({
				id: m._id.toString(),
				userId: m.userId,
				userName: m.userName,
				text: m.text,
				createdAt: m.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching messages:', error);
		return json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
	}
}

export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		if (!(await isTripMember(tripId, userId))) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const { text, userName } = await request.json();
		if (!text?.trim()) {
			return json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
		}

		const messages = await getCollection('messages');
		const now = new Date();
		const trimmed = text.trim();
		const result = await messages.insertOne({
			tripId: new ObjectId(tripId),
			userId,
			userName: userName || 'Unknown',
			text: trimmed,
			createdAt: now
		});

		const preview = trimmed.length > 50 ? trimmed.slice(0, 50) + '…' : trimmed;
		await logActivity(tripId, userId, userName || 'Unknown', 'chat_message', `wrote in chat: "${preview}"`);

		return json(
			{
				success: true,
				message: {
					id: result.insertedId.toString(),
					userId,
					userName: userName || 'Unknown',
					text: text.trim(),
					createdAt: now
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error sending message:', error);
		return json({ success: false, error: 'Failed to send message' }, { status: 500 });
	}
}
