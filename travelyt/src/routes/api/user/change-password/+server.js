import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { verifyPassword, hashPassword } from '$lib/server/auth.js';
import { isValidPassword } from '$lib/server/validators.js';
import { ObjectId } from 'mongodb';

export async function POST({ request, cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const { currentPassword, newPassword, confirmPassword } = await request.json();

		if (!currentPassword || !newPassword || !confirmPassword) {
			return json({ success: false, error: 'All fields are required' }, { status: 400 });
		}

		if (newPassword !== confirmPassword) {
			return json({ success: false, error: 'New passwords do not match' }, { status: 400 });
		}

		const passwordValidation = isValidPassword(newPassword);
		if (!passwordValidation.valid) {
			return json({ success: false, error: passwordValidation.message }, { status: 400 });
		}

		const users = await getCollection('users');
		const user = await users.findOne({ _id: new ObjectId(userId) });
		if (!user) return json({ success: false, error: 'User not found' }, { status: 404 });

		const valid = await verifyPassword(currentPassword, user.passwordHash);
		if (!valid) return json({ success: false, error: 'Current password is incorrect' }, { status: 403 });

		const newHash = await hashPassword(newPassword);
		await users.updateOne(
			{ _id: new ObjectId(userId) },
			{ $set: { passwordHash: newHash, updatedAt: new Date() } }
		);

		return json({ success: true });
	} catch (error) {
		console.error('Error changing password:', error);
		return json({ success: false, error: 'Failed to change password' }, { status: 500 });
	}
}
