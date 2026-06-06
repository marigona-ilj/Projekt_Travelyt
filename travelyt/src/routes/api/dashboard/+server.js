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

		// All upcoming/ongoing trips for carousel (endDate >= today)
		const carouselTrips = userTrips
			.filter((t) => new Date(t.endDate) >= now)
			.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

		let upcomingTripsData = [];
		if (carouselTrips.length > 0) {
			const carouselIds = carouselTrips.map((t) => t._id);
			const allCarouselMembers = await tripMembers.find({ tripId: { $in: carouselIds } }).toArray();
			const allMemberUserIds = [...new Set(allCarouselMembers.map((m) => m.userId.toString()))].map((id) => new ObjectId(id));
			const memberUsers = await usersCol.find({ _id: { $in: allMemberUserIds } }).toArray();
			const userMap = Object.fromEntries(memberUsers.map((u) => [u._id.toString(), u.name]));

			upcomingTripsData = carouselTrips.map((t) => {
				const members = allCarouselMembers
					.filter((m) => m.tripId.toString() === t._id.toString())
					.map((m) => ({ userId: m.userId.toString(), name: userMap[m.userId.toString()] || 'Unknown', role: m.role }));
				return {
					id: t._id.toString(),
					title: t.title,
					destination: t.destination,
					startDate: t.startDate,
					endDate: t.endDate,

					currency: t.currency || 'CHF',
					legs: t.legs ?? [],
					members
				};
			});
		}

		// Travel stats
		const completedTrips = userTrips.filter((t) => new Date(t.endDate) < now);
		const upcomingTrips = userTrips.filter((t) => new Date(t.startDate) > now);
		const completedTripIds = completedTrips.map((t) => t._id);

		const completedMemberships = await tripMembers.find({ tripId: { $in: completedTripIds } }).toArray();
		const companionIds = new Set(
			completedMemberships
				.filter((m) => m.userId.toString() !== userId)
				.map((m) => m.userId.toString())
		);

		const uniqueDestinations = new Set();
		for (const t of completedTrips) {
			if (t.legs?.length > 0) {
				t.legs.forEach((l) => { if (l.destination) uniqueDestinations.add(l.destination.trim().toLowerCase()); });
			} else if (t.destination) {
				uniqueDestinations.add(t.destination.trim().toLowerCase());
			}
		}

		const uniquePlannedDestinations = new Set();
		for (const t of upcomingTrips) {
			if (t.legs?.length > 0) {
				t.legs.forEach((l) => { if (l.destination) uniquePlannedDestinations.add(l.destination.trim().toLowerCase()); });
			} else if (t.destination) {
				uniquePlannedDestinations.add(t.destination.trim().toLowerCase());
			}
		}

		const totalSpent = allExpenses
			.filter((e) => e.paidBy.toString() === userId)
			.reduce((s, e) => s + (e.amount || 0), 0);

		const stats = {
			completedTrips: completedTrips.length,
			upcomingTrips: upcomingTrips.length,
			destinations: uniqueDestinations.size,
			plannedDestinations: uniquePlannedDestinations.size,
			totalSpent: Math.round(totalSpent * 100) / 100
		};

		return json({
			success: true,
			userName,
			stats,
			upcomingTrips: upcomingTripsData,
			balances
		});
	} catch (error) {
		console.error('Error fetching dashboard:', error);
		return json({ success: false, error: 'Failed to fetch dashboard' }, { status: 500 });
	}
}
