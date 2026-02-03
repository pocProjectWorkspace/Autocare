/**
 * Notifications Screen
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { notificationAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

const notificationIcons: Record<string, { name: any; color: string }> = {
    job_update: { name: 'clipboard-outline', color: colors.primary[400] },
    payment: { name: 'card-outline', color: colors.success.main },
    estimate: { name: 'receipt-outline', color: colors.warning.main },
    quote: { name: 'pricetag-outline', color: colors.accent[400] },
    reminder: { name: 'alarm-outline', color: colors.error.main },
    system: { name: 'information-circle-outline', color: colors.neutral[400] },
};

export default function NotificationsScreen() {
    const queryClient = useQueryClient();

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationAPI.list(),
    });

    const markReadMutation = useMutation({
        mutationFn: (ids: string[]) => notificationAPI.markRead(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const notifications = data?.data?.notifications || [];
    const unreadCount = data?.data?.unread_count || 0;

    const handleNotificationPress = (notification: any) => {
        if (!notification.is_read) {
            markReadMutation.mutate([notification.id]);
        }

        // Navigate based on notification type
        if (notification.reference_id && notification.reference_type === 'job_card') {
            router.push(`/job/${notification.reference_id}`);
        }
    };

    const handleMarkAllRead = () => {
        const unreadIds = notifications.filter((n: any) => !n.is_read).map((n: any) => n.id);
        if (unreadIds.length > 0) {
            markReadMutation.mutate(unreadIds);
        }
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const renderNotification = ({ item: notification }: { item: any }) => {
        const icon = notificationIcons[notification.type] || notificationIcons.system;

        return (
            <TouchableOpacity
                style={[styles.notification, !notification.is_read && styles.notificationUnread]}
                onPress={() => handleNotificationPress(notification)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                    <Ionicons name={icon.name} size={24} color={icon.color} />
                </View>

                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>{formatTime(notification.created_at)}</Text>
                </View>

                {!notification.is_read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={styles.markAllRead}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <Loading fullScreen message="Loading notifications..." />
            ) : notifications.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="notifications-off-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No notifications</Text>
                    <Text style={styles.emptyText}>You're all caught up!</Text>
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
    },
    title: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    markAllRead: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
    },
    list: {
        padding: spacing.lg,
        paddingTop: 0,
    },
    notification: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    notificationUnread: {
        backgroundColor: colors.background.elevated,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary[500],
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    notificationTitle: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
        marginBottom: 4,
    },
    notificationMessage: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    notificationTime: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.xs,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary[500],
        marginLeft: spacing.sm,
        marginTop: 4,
    },
    empty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyTitle: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: '600',
        marginTop: spacing.lg,
    },
    emptyText: {
        fontSize: typography.size.md,
        color: colors.text.tertiary,
        marginTop: spacing.sm,
    },
});
