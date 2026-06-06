import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const repayments = await getCollection('repayments');
		const list = await repayments
			.find({ tripId: new ObjectId(tripId) })
			.sort({ date: -1 })
			.toArray();

		return json({
			success: true,
			repayments: list.map((r) => ({
				id: r._id.toString(),
				from: r.from.toString(),
				to: r.to.toString(),
				amount: r.amount,
				date: r.date,
				note: r.note || ''
			}))
		});
	} catch {
		return json({ success: false, error: 'Failed to fetch repayments' }, { status: 500 });
	}
}

export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const { from, to, amount, date, note } = body;

	if (!from || !to || !amount || !date) {
		return json({ success: false, error: 'Missing required fields' }, { status: 400 });
	}
	if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
		return json({ success: false, error: 'Invalid amount' }, { status: 400 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const repayments = await getCollection('repayments');
		const result = await repayments.insertOne({
			tripId: new ObjectId(tripId),
			from: new ObjectId(from),
			to: new ObjectId(to),
			amount: parseFloat(amount),
			date: new Date(date),
			note: note || '',
			createdAt: new Date()
		});

		return json({ success: true, id: result.insertedId.toString() }, { status: 201 });
	} catch {
		return json({ success: false, error: 'Failed to record payment' }, { status: 500 });
	}
}
