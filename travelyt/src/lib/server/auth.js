import bcrypt from 'bcryptjs';
import { getCollection } from './db.js';
import { ObjectId } from 'mongodb';

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param {string} password
 * @returns {Promise<string>}
 */
export async function hashPassword(password) {
	return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, hash) {
	return await bcrypt.compare(password, hash);
}

/**
 * Create a new user
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function createUser(email, password, name) {
	try {
		const users = await getCollection('users');

		// Check if user exists
		const existing = await users.findOne({ email });
		if (existing) {
			return { success: false, error: 'User already exists' };
		}

		// Hash password and create user
		const passwordHash = await hashPassword(password);
		const result = await users.insertOne({
			email,
			passwordHash,
			name,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return { success: true, userId: result.insertedId.toString() };
	} catch (error) {
		console.error('Error creating user:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Authenticate user (login)
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, userId?: string, user?: object, error?: string}>}
 */
export async function authenticateUser(email, password) {
	try {
		const users = await getCollection('users');
		const user = await users.findOne({ email });

		if (!user) {
			return { success: false, error: 'Invalid email or password' };
		}

		const isValid = await verifyPassword(password, user.passwordHash);
		if (!isValid) {
			return { success: false, error: 'Invalid email or password' };
		}

		return {
			success: true,
			userId: user._id.toString(),
			user: {
				id: user._id.toString(),
				email: user.email,
				name: user.name
			}
		};
	} catch (error) {
		console.error('Error authenticating user:', error);
		return { success: false, error: error.message };
	}
}

/**
 * Get user by ID
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getUserById(userId) {
	try {
		const users = await getCollection('users');
		const user = await users.findOne({ _id: new ObjectId(userId) });

		if (!user) {
			return null;
		}

		// Don't return password hash
		const { passwordHash, ...safeUser } = user;
		return {
			id: user._id.toString(),
			email: user.email,
			name: user.name,
			createdAt: user.createdAt
		};
	} catch (error) {
		console.error('Error getting user:', error);
		return null;
	}
}
