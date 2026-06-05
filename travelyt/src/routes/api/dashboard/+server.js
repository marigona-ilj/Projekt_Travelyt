import { json } from '@sveltejs/kit';
import { getCollection } from '$lib/server/db.js';
import { ObjectId } from 'mongodb';

export async function GET({ cookies }) {
	const userId = cookies.get('userId');
	if (!userId) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	try {
		const usersCol = await getCollection('users');
		const tripMembers = await getCollection('tripMembers');
		const trips = await getCollection('trips');
		const expenses = await getCollection('expenses');

		const userDoc = await usersCol.findOne({ _id: new ObjectId(userId) });
		const userName = userDoc?.name || '';

		const memberships = await tripMembers.find({ userId: new ObjectId(userId) }).toArray();
		const tripIds = memberships.map((m) => m.tripId);

		if (tripIds.length === 0) {
			return json({ success: true, userName, nextTrip: null, balances: [] });
		}

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const userTrips = await trips
			.find({ _id: { $in: tripIds } })
			.sort({ startDate: 1 })
			.toArray();

		// Next upcoming trip (startDate >= today)
		const nextTrip =
			userTrips.find((t) => {
				const start = new Date(t.startDate);
				start.setHours(0, 0, 0, 0);
				return start >= now;
			}) ?? null;

		// Balance calculation across all trips
		const allExpenses = await expenses.find({ tripId: { $in: tripIds } }).toArray();

		const balancesMap = {};
		for (const exp of allExpenses) {
			const n = (exp.participants || []).length;
			if (n === 0) continue;
			const share = exp.amount / n;
			const key = exp.tripId.toString();
			if (!(key in balancesMap)) balancesMap[key] = 0;
			if (exp.paidBy.toString() === userId) balancesMap[key] += exp.amount;
			if ((exp.participants || []).some((p) => p.toString() === userId)) balancesMap[key] -= share;
		}

		const tripInfoMap = Object.fromEntries(
			userTrips.map((t) => [t._id.toString(), { title: t.title, currency: t.currency || 'CHF' }])
		);

		const balances = Object.entries(balancesMap)
			.filter(([, v]) => Math.abs(v) > 0.005)
			.map(([tripId, amount]) => ({
				tripId,
				tripTitle: tripInfoMap[tripId]?.title ?? 'Unknown',
				currency: tripInfoMap[tripId]?.currency ?? 'CHF',
				amount: Math.round(amount * 100) / 100
			}))
			.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

		// Members of the next trip
		let nextTripMembers = [];
		if (nextTrip) {
			const memberRows = await tripMembers
				.find({ tripId: nextTrip._id })
				.toArray();
			const memberUserIds = memberRows.map((m) => m.userId);
			const memberUsers = await usersCol
				.find({ _id: { $in: memberUserIds } })
				.toArray();
			const userMap = Object.fromEntries(memberUsers.map((u) => [u._id.toString(), u.name]));
			nextTripMembers = memberRows.map((m) => ({
				userId: m.userId.toString(),
				name: userMap[m.userId.toString()] || 'Unknown',
				role: m.role
			}));
		}

		return json({
			success: true,
			userName,
			nextTrip: nextTrip
				? {
						id: nextTrip._id.toString(),
						title: nextTrip.title,
						destination: nextTrip.destination,
						startDate: nextTrip.startDate,
						endDate: nextTrip.endDate,
						coverImage: nextTrip.coverImage || '',
						currency: nextTrip.currency || 'CHF'
					}
				: null,
			nextTripMembers,
			balances
		});
	} catch (error) {
		console.error('Error fetching dashboard:', error);
		return json({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 });
	}
}
