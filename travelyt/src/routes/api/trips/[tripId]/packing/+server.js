import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { validatePackingItem } from '$lib/server/validators.js';

// Get all packing items for trip
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const items = await packingItems
			.find({ tripId: new ObjectId(tripId) })
			.sort({ category: 1, item: 1 })
			.toArray();

		return json({
			success: true,
			items: items.map((item) => ({
				id: item._id.toString(),
				item: item.item,
				category: item.category,
				packed: item.packed || false,
				createdAt: item.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching packing items:', error);
		return json({ success: false, error: 'Failed to fetch packing items' }, { status: 500 });
	}
}

// Create packing item
export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const itemData = await request.json();
	const validation = validatePackingItem(itemData);

	if (!validation.valid) {
		return json({ success: false, errors: validation.errors }, { status: 400 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const packingItems = await getCollection('packingItems');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const result = await packingItems.insertOne({
			tripId: new ObjectId(tripId),
			item: itemData.item,
			category: itemData.category,
			packed: false,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return json(
			{
				success: true,
				item: {
					id: result.insertedId.toString(),
					...itemData,
					packed: false,
					createdAt: new Date()
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating packing item:', error);
		return json({ success: false, error: 'Failed to create packing item' }, { status: 500 });
	}
}
