import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({ tripId: new ObjectId(tripId), userId: new ObjectId(userId) });
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const checklist = await getCollection('tripChecklist');
		const items = await checklist.find({ tripId: new ObjectId(tripId) }).sort({ createdAt: 1 }).toArray();

		return json({
			success: true,
			items: items.map((item) => ({
				id: item._id.toString(),
				text: item.text,
				isPersonal: item.isPersonal || false,
				checked: item.isPersonal
					? (item.checkedBy || []).some((id) => id.toString() === userId)
					: item.checked || false,
				createdBy: item.createdBy?.toString() || '',
				createdAt: item.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching checklist:', error);
		return json({ success: false, error: 'Failed to fetch checklist' }, { status: 500 });
	}
}

export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({ tripId: new ObjectId(tripId), userId: new ObjectId(userId) });
		if (!isMember) return json({ success: false, error: 'Access denied' }, { status: 403 });

		const { text, isPersonal } = await request.json();
		if (!text?.trim()) return json({ success: false, error: 'Text is required' }, { status: 400 });

		const checklist = await getCollection('tripChecklist');
		const result = await checklist.insertOne({
			tripId: new ObjectId(tripId),
			text: text.trim(),
			isPersonal: isPersonal === true,
			checked: false,
			checkedBy: [],
			createdBy: new ObjectId(userId),
			createdAt: new Date()
		});

		return json({ success: true, id: result.insertedId.toString() }, { status: 201 });
	} catch (error) {
		console.error('Error creating checklist item:', error);
		return json({ success: false, error: 'Failed to create item' }, { status: 500 });
	}
}
