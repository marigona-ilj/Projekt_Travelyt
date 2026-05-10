import { writable } from 'svelte/store';

export type Notification = {
	id: string;
	type: 'success' | 'error' | 'info' | 'warning';
	message: string;
	duration?: number;
};

function createNotificationStore() {
	const { subscribe, set, update } = writable<Notification[]>([]);

	return {
		subscribe,
		add: (notification: Omit<Notification, 'id'>) => {
			const id = Date.now().toString();
			const duration = notification.duration || 3000;

			update((notifications) => [...notifications, { ...notification, id }]);

			// Auto-remove after duration
			if (duration > 0) {
				setTimeout(() => {
					update((notifications) => notifications.filter((n) => n.id !== id));
				}, duration);
			}

			return id;
		},
		remove: (id: string) => {
			update((notifications) => notifications.filter((n) => n.id !== id));
		},
		clear: () => {
			set([]);
		},
		success: (message: string, duration?: number) => {
			return createNotificationStore().add({ type: 'success', message, duration });
		},
		error: (message: string, duration?: number) => {
			return createNotificationStore().add({ type: 'error', message, duration });
		},
		info: (message: string, duration?: number) => {
			return createNotificationStore().add({ type: 'info', message, duration });
		}
	};
}

export const notifications = createNotificationStore();
