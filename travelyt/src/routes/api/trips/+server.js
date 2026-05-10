import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { validateTrip } from '$lib/server/validators.js';

// Get all trips for authenticated user
export async function GET({ cookies }) {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const trips = await getCollection('trips');

		// Find all trips where user is a member
		const memberRecords = await tripMembers
			.find({ userId: new ObjectId(userId) })
			.toArray();

		const tripIds = memberRecords.map((m) => m.tripId);

		// Fetch trip details
		const userTrips = await trips
			.find({ _id: { $in: tripIds } })
			.sort({ createdAt: -1 })
			.toArray();

		return json({
			success: true,
			trips: userTrips.map((trip) => ({
				id: trip._id.toString(),
				title: trip.title,
				destination: trip.destination,
				startDate: trip.startDate,
				endDate: trip.endDate,
				description: trip.description,
				createdBy: trip.createdBy.toString(),
				createdAt: trip.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching trips:', error);
		return json({ success: false, error: 'Failed to fetch trips' }, { status: 500 });
	}
}

// Create new trip
export async function POST({ request, cookies }) {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const tripData = await request.json();
	const validation = validateTrip(tripData);

	if (!validation.valid) {
		return json({ success: false, errors: validation.errors }, { status: 400 });
	}

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		// Create trip
		const tripResult = await trips.insertOne({
			title: tripData.title,
			destination: tripData.destination,
			description: tripData.description || '',
			startDate: new Date(tripData.startDate),
			endDate: new Date(tripData.endDate),
			createdBy: new ObjectId(userId),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		// Add creator as member
		await tripMembers.insertOne({
			tripId: tripResult.insertedId,
			userId: new ObjectId(userId),
			role: 'owner',
			joinedAt: new Date()
		});

		return json(
			{
				success: true,
				trip: {
					id: tripResult.insertedId.toString(),
					...tripData,
					createdAt: new Date()
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating trip:', error);
		return json({ success: false, error: 'Failed to create trip' }, { status: 500 });
	}
}
