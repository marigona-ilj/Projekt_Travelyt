import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

const DEFAULTS = {
	member_changes: true,
	expenses: true,
	activities: true,
	chat: true,
	photos: true,
	packing: true
};

export async function GET({ cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const users = await getCollection('users');
		const user = await users.findOne({ _id: new ObjectId(userId) }, { projection: { notificationPrefs: 1 } });
		const prefs = { ...DEFAULTS, ...(user?.notificationPrefs ?? {}) };
		return json({ success: true, prefs });
	} catch {
		return json({ success: false, error: 'Failed to load preferences' }, { status: 500 });
	}
}

export async function PATCH({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const updates = await request.json();
		const allowed = Object.keys(DEFAULTS);
		const sanitized = {};
		for (const key of allowed) {
			if (key in updates) sanitized[key] = Boolean(updates[key]);
		}

		const users = await getCollection('users');
		await users.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { notificationPrefs: sanitized, updatedAt: new Date() } }
		);
		return json({ success: true });
	} catch {
		return json({ success: false, error: 'Failed to save preferences' }, { status: 500 });
	}
}
