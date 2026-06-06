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

// Get trip details
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const trip = await trips.findOne({ _id: new ObjectId(tripId) });

		if (!trip) {
			return json({ success: false, error: 'Trip not found' }, { status: 404 });
		}

		return json({
			success: true,
			trip: {
				id: trip._id.toString(),
				title: trip.title,
				destination: trip.destination,
				description: trip.description,
				startDate: trip.startDate,
				endDate: trip.endDate,
				currency: trip.currency || 'CHF',
				coverImage: trip.coverImage || '',
				latitude: trip.latitude ?? null,
				longitude: trip.longitude ?? null,
				resolvedLocation: trip.resolvedLocation || '',
				createdBy: trip.createdBy.toString(),
				createdAt: trip.createdAt,
				updatedAt: trip.updatedAt,
				legs: normLegs(trip)
			}
		});
	} catch (error) {
		console.error('Error fetching trip:', error);
		return json({ success: false, error: 'Failed to fetch trip' }, { status: 500 });
	}
}

// Update trip
export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');

		// Check if user is owner
		const trip = await trips.findOne({ _id: new ObjectId(tripId) });
		if (!trip || trip.createdBy.toString() !== userId) {
			return json({ success: false, error: 'Only owner can update trip' }, { status: 403 });
		}

		const updateData = await request.json();
		const validation = validateTrip(updateData);

		if (!validation.valid) {
			return json({ success: false, errors: validation.errors }, { status: 400 });
		}

		let updStart, updEnd, updDest, updLat, updLon, updResolved, updLegs;
		if (updateData.legs?.length > 0) {
			const first = updateData.legs[0];
			const last = updateData.legs[updateData.legs.length - 1];
			updStart = new Date(first.startDate);
			updEnd = new Date(last.endDate);
			updDest = first.destination;
			updLat = first.latitude ?? null;
			updLon = first.longitude ?? null;
			updResolved = first.resolvedLocation || '';
			updLegs = updateData.legs.map((leg) => ({
				destination: leg.destination,
				resolvedLocation: leg.resolvedLocation || '',
				latitude: leg.latitude ?? null,
				longitude: leg.longitude ?? null,
				startDate: new Date(leg.startDate),
				endDate: new Date(leg.endDate)
			}));
		} else {
			updStart = new Date(updateData.startDate);
			updEnd = new Date(updateData.endDate);
			updDest = updateData.destination;
			updLat = updateData.latitude ?? null;
			updLon = updateData.longitude ?? null;
			updResolved = updateData.resolvedLocation || '';
			updLegs = [];
		}

		// Check for date overlap with other trips (excluding this one)
		const memberRecords = await tripMembers.find({ userId: new ObjectId(userId) }).toArray();
		const otherTripIds = memberRecords.map((m) => m.tripId).filter((id) => id.toString() !== tripId);
		const overlapping = await trips.findOne({
			_id: { $in: otherTripIds },
			startDate: { $lte: updEnd },
			endDate: { $gte: updStart }
		});
		if (overlapping) {
			return json({ success: false, error: `Date range overlaps with your existing trip "${overlapping.title}"` }, { status: 400 });
		}

		await trips.updateOne(
			{ _id: new ObjectId(tripId) },
			{
				$set: {
					title: updateData.title,
					destination: updDest,
					description: updateData.description || '',
					startDate: updStart,
					endDate: updEnd,
					currency: updateData.currency || 'CHF',
					coverImage: updateData.coverImage || '',
					...(updLat != null ? { latitude: updLat, longitude: updLon, resolvedLocation: updResolved } : {}),
					legs: updLegs,
					updatedAt: new Date()
				}
			}
		);

		return json({ success: true, message: 'Trip updated' });
	} catch (error) {
		console.error('Error updating trip:', error);
		return json({ success: false, error: 'Failed to update trip' }, { status: 500 });
	}
}

// Delete trip
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const trips = await getCollection('trips');
		const tripMembers = await getCollection('tripMembers');
		const activities = await getCollection('activities');
		const expenses = await getCollection('expenses');
		const packingItems = await getCollection('packingItems');

		// Check if user is owner
		const trip = await trips.findOne({ _id: new ObjectId(tripId) });
		if (!trip || trip.createdBy.toString() !== userId) {
			return json({ success: false, error: 'Only owner can delete trip' }, { status: 403 });
		}

		const tripObjectId = new ObjectId(tripId);
		const activityLogs = await getCollection('tripActivityLog');

		// Delete all related data
		await tripMembers.deleteMany({ tripId: tripObjectId });
		await activities.deleteMany({ tripId: tripObjectId });
		await expenses.deleteMany({ tripId: tripObjectId });
		await packingItems.deleteMany({ tripId: tripObjectId });
		await activityLogs.deleteMany({ tripId: tripObjectId });
		await trips.deleteOne({ _id: tripObjectId });

		return json({ success: true, message: 'Trip deleted' });
	} catch (error) {
		console.error('Error deleting trip:', error);
		return json({ success: false, error: 'Failed to delete trip' }, { status: 500 });
	}
}
