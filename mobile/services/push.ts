/**
 * Push Notification Service - Firebase Cloud Messaging
 */
// Note: Install these packages: npx expo install expo-notifications expo-device
// @ts-ignore
import * as Notifications from 'expo-notifications';
// @ts-ignore
import * as Device from 'expo-device';
import { Platform } from 'react-native';
// @ts-ignore
import Constants from 'expo-constants';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

class PushNotificationService {
    private expoPushToken: string | null = null;
    private notificationListener: any = null;
    private responseListener: any = null;

    /**
     * Initialize push notifications
     */
    async initialize(): Promise<string | null> {
        if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return null;
        }

        try {
            // Request permissions
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.log('Failed to get push notification permissions');
                return null;
            }

            // Get Expo push token
            const tokenData = await Notifications.getExpoPushTokenAsync({
                projectId: Constants.expoConfig?.extra?.eas?.projectId,
            });
            this.expoPushToken = tokenData.data;

            // Configure Android channel
            if (Platform.OS === 'android') {
                await Notifications.setNotificationChannelAsync('autocare_notifications', {
                    name: 'AutoCare Notifications',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#4F5BFF',
                });
            }

            return this.expoPushToken;
        } catch (error) {
            console.error('Error initializing push notifications:', error);
            return null;
        }
    }

    /**
     * Register token with backend
     */
    async registerToken(userId: string): Promise<boolean> {
        if (!this.expoPushToken) {
            await this.initialize();
        }

        if (!this.expoPushToken) {
            return false;
        }

        try {
            await api.post('/notifications/register-device', {
                token: this.expoPushToken,
                platform: Platform.OS,
                user_id: userId,
            });
            return true;
        } catch (error) {
            console.error('Failed to register push token:', error);
            return false;
        }
    }

    /**
     * Add notification listeners
     */
    addListeners(
        onNotification?: (notification: Notifications.Notification) => void,
        onNotificationResponse?: (response: Notifications.NotificationResponse) => void
    ): void {
        // When notification is received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener((notification: any) => {
            console.log('Notification received:', notification);
            onNotification?.(notification);
        });

        // When user taps on notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener((response: any) => {
            console.log('Notification response:', response);
            onNotificationResponse?.(response);

            // Handle navigation based on notification data
            const data = response.notification.request.content.data;
            this.handleNotificationNavigation(data);
        });
    }

    /**
     * Remove notification listeners
     */
    removeListeners(): void {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
        }
    }

    /**
     * Handle navigation from notification tap
     */
    private handleNotificationNavigation(data: any): void {
        if (!data) return;

        const { type, job_id, job_number } = data;

        switch (type) {
            case 'job_update':
            case 'job_status_changed':
                // Navigate to job details
                // router.push(`/job/${job_id}`);
                break;
            case 'estimate_ready':
            case 'approval_required':
                // Navigate to approvals
                // router.push('/approvals');
                break;
            case 'payment_received':
                // Navigate to payments
                // router.push('/payments');
                break;
            case 'driver_assignment':
            case 'pickup_started':
            case 'delivery_started':
                // Navigate to tracking
                // router.push(`/track/${job_id}`);
                break;
            default:
                // Navigate to notifications list
                // router.push('/notifications');
                break;
        }
    }

    /**
     * Get the push token
     */
    getToken(): string | null {
        return this.expoPushToken;
    }

    /**
     * Schedule a local notification
     */
    async scheduleLocalNotification(
        title: string,
        body: string,
        data?: Record<string, any>,
        trigger?: Notifications.NotificationTriggerInput
    ): Promise<string> {
        return await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                sound: true,
            },
            trigger: trigger || null, // null = immediate
        });
    }

    /**
     * Cancel all scheduled notifications
     */
    async cancelAllNotifications(): Promise<void> {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    /**
     * Get badge count
     */
    async getBadgeCount(): Promise<number> {
        return await Notifications.getBadgeCountAsync();
    }

    /**
     * Set badge count
     */
    async setBadgeCount(count: number): Promise<void> {
        await Notifications.setBadgeCountAsync(count);
    }

    /**
     * Clear badge
     */
    async clearBadge(): Promise<void> {
        await Notifications.setBadgeCountAsync(0);
    }
}

export const pushNotificationService = new PushNotificationService();

// Helper hooks
export function usePushNotifications() {
    return {
        initialize: () => pushNotificationService.initialize(),
        registerToken: (userId: string) => pushNotificationService.registerToken(userId),
        getToken: () => pushNotificationService.getToken(),
        addListeners: pushNotificationService.addListeners.bind(pushNotificationService),
        removeListeners: pushNotificationService.removeListeners.bind(pushNotificationService),
    };
}
