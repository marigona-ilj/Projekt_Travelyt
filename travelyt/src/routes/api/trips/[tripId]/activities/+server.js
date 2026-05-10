import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { validateActivity } from '$lib/server/validators.js';

// Get all activities for trip
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

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

		const tripActivities = await activities
			.find({ tripId: new ObjectId(tripId) })
			.sort({ date: 1 })
			.toArray();

		return json({
			success: true,
			activities: tripActivities.map((activity) => ({
				id: activity._id.toString(),
				title: activity.title,
				description: activity.description,
				date: activity.date instanceof Date
					? activity.date.toISOString().split('T')[0]
					: String(activity.date).split('T')[0],
				time: activity.time,
				location: activity.location,
				category: activity.category,
				createdBy: activity.createdBy.toString(),
				createdAt: activity.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching activities:', error);
		return json({ success: false, error: 'Failed to fetch activities' }, { status: 500 });
	}
}

// Create activity
export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const activityData = await request.json();
	const validation = validateActivity(activityData);

	if (!validation.valid) {
		return json({ success: false, errors: validation.errors }, { status: 400 });
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

		const result = await activities.insertOne({
			tripId: new ObjectId(tripId),
			title: activityData.title,
			description: activityData.description || '',
			date: new Date(activityData.date),
			time: activityData.time || '',
			location: activityData.location || '',
			category: activityData.category || 'other',
			createdBy: new ObjectId(userId),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return json(
			{
				success: true,
				activity: {
					id: result.insertedId.toString(),
					...activityData,
					createdBy: userId,
					createdAt: new Date()
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating activity:', error);
		return json({ success: false, error: 'Failed to create activity' }, { status: 500 });
	}
}
