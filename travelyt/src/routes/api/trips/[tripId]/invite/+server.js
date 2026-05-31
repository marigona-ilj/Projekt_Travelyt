import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

function generateCode() {
	return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8);
}

// Get or create invite code
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({ tripId: new ObjectId(tripId), userId: new ObjectId(userId) });
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const trips = await getCollection('trips');
		let trip = await trips.findOne({ _id: new ObjectId(tripId) });

		if (!trip.inviteCode) {
			const code = generateCode();
			await trips.updateOne({ _id: new ObjectId(tripId) }, { $set: { inviteCode: code } });
			return json({ success: true, code });
		}

		return json({ success: true, code: trip.inviteCode });
	} catch (error) {
		console.error('Error generating invite code:', error);
		return json({ success: false, error: 'Failed to generate invite link' }, { status: 500 });
	}
}

// Revoke invite code (owner only)
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const trips = await getCollection('trips');
		const trip = await trips.findOne({ _id: new ObjectId(tripId) });

		if (!trip || trip.createdBy.toString() !== userId) {
			return json({ success: false, error: 'Only the owner can revoke the invite link' }, { status: 403 });
		}

		await trips.updateOne({ _id: new ObjectId(tripId) }, { $unset: { inviteCode: '' } });
		return json({ success: true });
	} catch (error) {
		console.error('Error revoking invite code:', error);
		return json({ success: false, error: 'Failed to revoke invite link' }, { status: 500 });
	}
}
