import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { validateExpense } from '$lib/server/validators.js';

// Get all expenses for trip
export async function GET({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const expenses = await getCollection('expenses');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const tripExpenses = await expenses
			.find({ tripId: new ObjectId(tripId) })
			.sort({ date: -1 })
			.toArray();

		const total = tripExpenses.reduce((sum, exp) => sum + exp.amount, 0);

		return json({
			success: true,
			expenses: tripExpenses.map((expense) => ({
				id: expense._id.toString(),
				description: expense.description,
				amount: expense.amount,
				category: expense.category,
				paidBy: expense.paidBy.toString(),
				date: expense.date,
				createdAt: expense.createdAt
			})),
			total
		});
	} catch (error) {
		console.error('Error fetching expenses:', error);
		return json({ success: false, error: 'Failed to fetch expenses' }, { status: 500 });
	}
}

// Create expense
export async function POST({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const expenseData = await request.json();
	const validation = validateExpense(expenseData);

	if (!validation.valid) {
		return json({ success: false, errors: validation.errors }, { status: 400 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const expenses = await getCollection('expenses');

		// Verify user is member of trip
		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const result = await expenses.insertOne({
			tripId: new ObjectId(tripId),
			description: expenseData.description,
			amount: parseFloat(expenseData.amount),
			category: expenseData.category || 'other',
			paidBy: new ObjectId(expenseData.paidBy || userId),
			date: new Date(expenseData.date),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		return json(
			{
				success: true,
				expense: {
					id: result.insertedId.toString(),
					...expenseData,
					createdAt: new Date()
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating expense:', error);
		return json({ success: false, error: 'Failed to create expense' }, { status: 500 });
	}
}
