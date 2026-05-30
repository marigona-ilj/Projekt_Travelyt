import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const gallery = await getCollection('gallery');
		const photos = await gallery
			.find({ tripId: new ObjectId(tripId) })
			.sort({ createdAt: -1 })
			.toArray();

		return json({
			success: true,
			photos: photos.map((p) => ({
				id: p._id.toString(),
				image: p.image,
				caption: p.caption || '',
				uploadedBy: p.uploadedBy.toString(),
				uploaderName: p.uploaderName,
				createdAt: p.createdAt
			}))
		});
	} catch (error) {
		console.error('Error fetching gallery:', error);
		return json({ success: false, error: 'Failed to load photos' }, { status: 500 });
	}
}

export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const { image, caption } = await request.json();
		if (!image) {
			return json({ success: false, error: 'No image provided' }, { status: 400 });
		}

		const userName = await getUserName(userId);
		const gallery = await getCollection('gallery');

		await gallery.insertOne({
			tripId: new ObjectId(tripId),
			uploadedBy: new ObjectId(userId),
			uploaderName: userName,
			image,
			caption: caption || '',
			createdAt: new Date()
		});

		await logActivity(tripId, userId, userName, 'photo_added', 'added a photo to the gallery');

		return json({ success: true, message: 'Photo uploaded' }, { status: 201 });
	} catch (error) {
		console.error('Error uploading photo:', error);
		return json({ success: false, error: 'Failed to upload photo' }, { status: 500 });
	}
}
