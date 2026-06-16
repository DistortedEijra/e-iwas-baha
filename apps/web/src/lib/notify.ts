import { Capacitor } from '@capacitor/core';

let _id = 1000;

/**
 * Shows a push notification via Capacitor LocalNotifications on native,
 * or the Web Notifications API in the browser/PWA.
 */
export async function sendNotification(title: string, body: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [
          {
            id: _id++,
            title,
            body,
            // Small delay so Android has time to display it
            schedule: { at: new Date(Date.now() + 300) },
            iconColor: '#1e40af',
          },
        ],
      });
    } catch {
      // Native bridge unavailable – silent fail
    }
    return;
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.svg' });
  }
}

/** Requests notification permission on both native and web. */
export async function requestNotificationPermission(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
    } catch {
      // ignore
    }
    return;
  }

  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}
