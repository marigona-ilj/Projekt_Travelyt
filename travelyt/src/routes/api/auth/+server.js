import { json } from '@sveltejs/kit';
import { createUser, authenticateUser } from '$lib/server/auth.js';
import { isValidEmail, isValidPassword } from '$lib/server/validators.js';

export async function POST({ request, url }) {
	const action = url.searchParams.get('action');

	if (action === 'register') {
		const { email, password, confirmPassword, name } = await request.json();

		// Validation
		if (!email || !isValidEmail(email)) {
			return json({ success: false, error: 'Valid email is required' }, { status: 400 });
		}

		const passwordValidation = isValidPassword(password);
		if (!passwordValidation.valid) {
			return json({ success: false, error: passwordValidation.message }, { status: 400 });
		}

		if (password !== confirmPassword) {
			return json({ success: false, error: 'Passwords do not match' }, { status: 400 });
		}

		if (!name || name.trim().length === 0) {
			return json({ success: false, error: 'Name is required' }, { status: 400 });
		}

		const result = await createUser(email, password, name);
		if (!result.success) {
			return json({ success: false, error: result.error }, { status: 400 });
		}

		const response = json({ success: true, message: 'Registration successful' });
		response.headers.set(
			'Set-Cookie',
			`userId=${result.userId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`
		);
		return response;
	} else if (action === 'login') {
		const { email, password } = await request.json();

		if (!email || !password) {
			return json({ success: false, error: 'Email and password are required' }, { status: 400 });
		}

		const result = await authenticateUser(email, password);
		if (!result.success) {
			return json({ success: false, error: result.error }, { status: 401 });
		}

		// Set session cookie
		const response = json({ success: true, user: result.user });

		// Simple session: store user ID in cookie
		// In production, use a proper session library
		response.headers.set(
			'Set-Cookie',
			`userId=${result.userId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`
		);

		return response;
	}

	return json({ success: false, error: 'Invalid action' }, { status: 400 });
}

export async function GET({ cookies }) {
	const userId = cookies.get('userId');

	if (!userId) {
		return json({ authenticated: false });
	}

	return json({ authenticated: true, userId });
}
