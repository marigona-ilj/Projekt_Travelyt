/**
 * Format date to readable string
 * @param {Date|string} date
 * @returns {string}
 */
export function formatDate(date) {
	const d = new Date(date);
	const options = { year: 'numeric', month: 'short', day: 'numeric' };
	return d.toLocaleDateString('en-GB', options);
}

/**
 * Calculate days between two dates
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {number}
 */
export function daysBetween(startDate, endDate) {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffTime = Math.abs(end - start);
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Format currency
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
	return new Intl.NumberFormat('en-GB', {
		style: 'currency',
		currency
	}).format(amount);
}

