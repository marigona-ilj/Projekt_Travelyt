import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

let cachedClient = null;

/**
 * Get or create a MongoDB client connection
 * @returns {Promise<MongoClient>}
 */
export async function getMongoClient() {
	if (cachedClient) {
		return cachedClient;
	}

	try {
		const client = new MongoClient(MONGODB_URI, {
			maxPoolSize: 10,
			retryWrites: true
		});

		await client.connect();
		console.log('✓ MongoDB connected');

		cachedClient = client;
		return client;
	} catch (error) {
		console.error('✗ MongoDB connection failed:', error.message);
		throw error;
	}
}

/**
 * Get the database instance
 * @returns {Promise<Database>}
 */
export async function getDb() {
	const client = await getMongoClient();
	return client.db('travelyt');
}

/**
 * Get a specific collection
 * @param {string} collectionName
 * @returns {Promise<Collection>}
 */
export async function getCollection(collectionName) {
	const db = await getDb();
	return db.collection(collectionName);
}

/**
 * Close MongoDB connection (for graceful shutdown)
 */
export async function closeMongoClient() {
	if (cachedClient) {
		await cachedClient.close();
		cachedClient = null;
		console.log('✓ MongoDB disconnected');
	}
}
