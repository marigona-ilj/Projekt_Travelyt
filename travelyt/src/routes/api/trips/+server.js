import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { validateTrip } from '$lib/server/validators.js';

function normLegs(trip) {
	if (trip.legs?.length > 0) return trip.legs;
	return [{
		destination: trip.destination,
		resolvedLocation: trip.resolvedLocation || '',
		latitude: trip.latitude ?? null,
		longitude: trip.longitude ?? null,
		startDate: trip.startDate,
		endDate: trip.endDate
	}];
}

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
				currency: trip.currency || 'CHF',
				coverImage: trip.coverImage || '',
				createdBy: trip.createdBy.toString(),
				createdAt: trip.createdAt,
				legs: normLegs(trip)
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

		// Derive top-level fields from legs if provided
		let tripStart, tripEnd, tripDest, tripLat, tripLon, tripResolved, storedLegs;
		if (tripData.legs?.length > 0) {
			const first = tripData.legs[0];
			const last = tripData.legs[tripData.legs.length - 1];
			tripStart = new Date(first.startDate);
			tripEnd = new Date(last.endDate);
			tripDest = first.destination;
			tripLat = first.latitude ?? null;
			tripLon = first.longitude ?? null;
			tripResolved = first.resolvedLocation || '';
			storedLegs = tripData.legs.map((leg) => ({
				destination: leg.destination,
				resolvedLocation: leg.resolvedLocation || '',
				latitude: leg.latitude ?? null,
				longitude: leg.longitude ?? null,
				startDate: new Date(leg.startDate),
				endDate: new Date(leg.endDate)
			}));
		} else {
			tripStart = new Date(tripData.startDate);
			tripEnd = new Date(tripData.endDate);
			tripDest = tripData.destination;
			tripLat = tripData.latitude ?? null;
			tripLon = tripData.longitude ?? null;
			tripResolved = tripData.resolvedLocation || '';
			storedLegs = [];
		}

		// Check for date overlap with existing trips
		const memberRecords = await tripMembers.find({ userId: new ObjectId(userId) }).toArray();
		const existingTripIds = memberRecords.map((m) => m.tripId);
		const overlapping = await trips.findOne({
			_id: { $in: existingTripIds },
			startDate: { $lte: tripEnd },
			endDate: { $gte: tripStart }
		});
		if (overlapping) {
			return json({ success: false, error: `Date range overlaps with your existing trip "${overlapping.title}"` }, { status: 400 });
		}

		// Create trip
		const tripResult = await trips.insertOne({
			title: tripData.title,
			destination: tripDest,
			description: tripData.description || '',
			startDate: tripStart,
			endDate: tripEnd,
			currency: tripData.currency || 'CHF',
			coverImage: tripData.coverImage || '',
			...(tripLat != null ? { latitude: tripLat, longitude: tripLon, resolvedLocation: tripResolved } : {}),
			legs: storedLegs,
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
