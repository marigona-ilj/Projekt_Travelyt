import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { verifyPassword } from '$lib/server/auth.js';
import { ObjectId } from 'mongodb';

// PATCH: update name and/or avatar
export async function PATCH({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { name, avatar } = await request.json();
		const update = { updatedAt: new Date() };

		if (name !== undefined) {
			if (!name || name.trim().length === 0) {
				return json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
			}
			update.name = name.trim();
		}

		if (avatar !== undefined) {
			update.avatar = avatar;
		}

		const users = await getCollection('users');
		await users.updateOne({ _id: new ObjectId(userId) }, { $set: update });

		return json({ success: true });
	} catch (error) {
		console.error('Error updating user:', error);
		return json({ success: false, error: 'Failed to update profile' }, { status: 500 });
	}
}

// DELETE: delete account (requires password confirmation)
export async function DELETE({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { password } = await request.json();
		if (!password) return json({ success: false, error: 'Password is required' }, { status: 400 });

		const users = await getCollection('users');
		const user = await users.findOne({ _id: new ObjectId(userId) });
		if (!user) return json({ success: false, error: 'User not found' }, { status: 404 });

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) return json({ success: false, error: 'Incorrect password' }, { status: 403 });

		const tripMembers = await getCollection('tripMembers');
		const tripInvites = await getCollection('tripInvites');

		await Promise.all([
			users.deleteOne({ _id: new ObjectId(userId) }),
			tripMembers.deleteMany({ userId: new ObjectId(userId) }),
			tripInvites.deleteMany({ email: user.email.toLowerCase() })
		]);

		const response = json({ success: true });
		response.headers.set('Set-Cookie', 'userId=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
		return response;
	} catch (error) {
		console.error('Error deleting account:', error);
		return json({ success: false, error: 'Failed to delete account' }, { status: 500 });
	}
}
