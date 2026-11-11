import * as Notifications from 'expo-notifications';

export async function clearLegacyReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.app === 'lembrei') {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
