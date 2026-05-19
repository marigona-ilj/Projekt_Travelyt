import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';
import { logActivity, getUserName } from '$lib/server/activityLog.js';

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

		// Verify user is member of trip
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
