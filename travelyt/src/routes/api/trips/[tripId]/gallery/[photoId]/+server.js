import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, photoId } = params;

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
		const photo = await gallery.findOne({
			_id: new ObjectId(photoId),
			tripId: new ObjectId(tripId)
		});

		if (!photo) {
			return json({ success: false, error: 'Photo not found' }, { status: 404 });
		}

		if (photo.uploadedBy.toString() !== userId) {
			return json({ success: false, error: 'Only the uploader can delete this photo' }, { status: 403 });
		}

		await gallery.deleteOne({ _id: new ObjectId(photoId) });

		const userName = await getUserName(userId);
		await logActivity(tripId, userId, userName, 'photo_deleted', 'removed a photo from the gallery');

		return json({ success: true, message: 'Photo deleted' });
	} catch (error) {
		console.error('Error deleting photo:', error);
		return json({ success: false, error: 'Failed to delete photo' }, { status: 500 });
	}
}
