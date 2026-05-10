/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {{valid: boolean, message?: string}}
 */
export function isValidPassword(password) {
	if (!password || password.length < 8) {
		return { valid: false, message: 'Password must be at least 8 characters' };
	}
	return { valid: true };
}

/**
 * Validate trip data
 * @param {object} trip
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateTrip(trip) {
	const errors = [];

	if (!trip.title || trip.title.trim().length === 0) {
		errors.push('Trip title is required');
	}
	if (!trip.destination || trip.destination.trim().length === 0) {
		errors.push('Destination is required');
	}
	if (!trip.startDate || isNaN(new Date(trip.startDate))) {
		errors.push('Valid start date is required');
	}
	if (!trip.endDate || isNaN(new Date(trip.endDate))) {
		errors.push('Valid end date is required');
	}
	if (new Date(trip.startDate) > new Date(trip.endDate)) {
		errors.push('Start date must be before end date');
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate activity data
 * @param {object} activity
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateActivity(activity) {
	const errors = [];

	if (!activity.title || activity.title.trim().length === 0) {
		errors.push('Activity title is required');
	}
	if (!activity.date || isNaN(new Date(activity.date))) {
		errors.push('Valid date is required');
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate expense data
 * @param {object} expense
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateExpense(expense) {
	const errors = [];

	if (!expense.description || expense.description.trim().length === 0) {
		errors.push('Description is required');
	}
	if (!expense.amount || expense.amount <= 0) {
		errors.push('Amount must be greater than 0');
	}
	if (!expense.date || isNaN(new Date(expense.date))) {
		errors.push('Valid date is required');
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Validate packing item data
 * @param {object} item
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validatePackingItem(item) {
	const errors = [];

	if (!item.item || item.item.trim().length === 0) {
		errors.push('Item name is required');
	}
	if (!item.category || item.category.trim().length === 0) {
		errors.push('Category is required');
	}

	return { valid: errors.length === 0, errors };
}
