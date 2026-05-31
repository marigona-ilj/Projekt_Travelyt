import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

// Update expense
export async function PUT({ params, request, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, expenseId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const expenses = await getCollection('expenses');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const updateData = await request.json();

		const result = await expenses.updateOne(
			{ _id: new ObjectId(expenseId), tripId: new ObjectId(tripId) },
			{
				$set: {
					description: updateData.description,
					amount: parseFloat(updateData.amount),
					date: new Date(updateData.date),
					paidBy: new ObjectId(updateData.paidBy),
					category: updateData.category || 'other',
					participants: (updateData.participants || []).map((id) => new ObjectId(id)),
					updatedAt: new Date()
				}
			}
		);

		if (result.matchedCount === 0) {
			return json({ success: false, error: 'Expense not found' }, { status: 404 });
		}

		const userName = await getUserName(userId);
		await logActivity(tripId, userId, userName, 'expense_updated', `updated expense: ${updateData.description}`);

		return json({ success: true, message: 'Expense updated' });
	} catch (error) {
		console.error('Error updating expense:', error);
		return json({ success: false, error: 'Failed to update expense' }, { status: 500 });
	}
}

// Delete expense
export async function DELETE({ params, cookies }) {
	const userId = cookies.get('userId');
	const { tripId, expenseId } = params;

	if (!userId) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const tripMembers = await getCollection('tripMembers');
		const expenses = await getCollection('expenses');

		const isMember = await tripMembers.findOne({
			tripId: new ObjectId(tripId),
			userId: new ObjectId(userId)
		});

		if (!isMember) {
			return json({ success: false, error: 'Access denied' }, { status: 403 });
		}

		const expense = await expenses.findOne({
			_id: new ObjectId(expenseId),
			tripId: new ObjectId(tripId)
		});

		if (!expense) {
			return json({ success: false, error: 'Expense not found' }, { status: 404 });
		}

		await expenses.deleteOne({ _id: new ObjectId(expenseId) });

		const userName = await getUserName(userId);
		await logActivity(tripId, userId, userName, 'expense_deleted', `deleted an expense: ${expense.description}`);

		return json({ success: true, message: 'Expense deleted' });
	} catch (error) {
		console.error('Error deleting expense:', error);
		return json({ success: false, error: 'Failed to delete expense' }, { status: 500 });
	}
}
