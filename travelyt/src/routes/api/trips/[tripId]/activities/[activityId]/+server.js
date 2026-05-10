import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

// Get activity
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, activityId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const activities = await getCollection('activities');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const activity = await activities.findOne({
			_id: new ObjectId(activityId),
			tripId: new ObjectId(tripId)
		});

		if (!activity) {
			return json({ success: false, error: 'Activity not found' }, { status: 404 });
		}

		return json({
			success: true,
			activity: {
				id: activity._id.toString(),
				title: activity.title,
				description: activity.description,
				date: activity.date,
				time: activity.time,
				location: activity.location,
				category: activity.category,
				createdBy: activity.createdBy.toString()
			}
		});
	} catch (error) {
		console.error('Error fetching activity:', error);
		return json({ success: false, error: 'Failed to fetch activity' }, { status: 500 });
	}
}

// Update activity
export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, activityId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const activities = await getCollection('activities');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const updateData = await request.json();

		const result = await activities.updateOne(
			{ _id: new ObjectId(activityId), tripId: new ObjectId(tripId) },
			{
				$set: {
					title: updateData.title,
					description: updateData.description || '',
					date: new Date(updateData.date),
					time: updateData.time || '',
					location: updateData.location || '',
					category: updateData.category || 'other',
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ success: false, error: 'Activity not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Activity updated' });
	} catch (error) {
		console.error('Error updating activity:', error);
		return json({ success: false, error: 'Failed to update activity' }, { status: 500 });
	}
}

// Delete activity
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, activityId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const activities = await getCollection('activities');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const result = await activities.deleteOne({
			_id: new ObjectId(activityId),
			tripId: new ObjectId(tripId)
		});

		if (result.deletedCount === 0) {
			return json({ success: false, error: 'Activity not found' }, { status: 404 });
		}

		return json({ success: true, message: 'Activity deleted' });
	} catch (error) {
		console.error('Error deleting activity:', error);
		return json({ success: false, error: 'Failed to delete activity' }, { status: 500 });
	}
}
