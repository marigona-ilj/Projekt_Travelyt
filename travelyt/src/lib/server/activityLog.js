import { getCollection } from './db.js';
import { ObjectId } from 'mongodb';

export async function getUserName(userId) {
	const users = await getCollection('users');
	const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { name: 1 } });
	return user?.name || 'Someone';
}

export async function logActivity(tripId, userId, userName, actionType, message) {
	try {
		const logs = await getCollection('tripActivityLog');
		await logs.insertOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId),
			userName,
			actionType,
			message,
			createdAt: new Date()
		});
	} catch (err) {
		console.error('Failed to log activity:', err);
	}
}
