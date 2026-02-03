/**
 * Profile Screen
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

export default function ProfileScreen() {
    const { user, logout } = useAuthStore();

    const menuItems = [
        { icon: 'person-outline', label: 'Edit Profile', route: '/profile/edit' },
        { icon: 'car-outline', label: 'My Vehicles', route: '/vehicles' },
        { icon: 'location-outline', label: 'Saved Addresses', route: '/addresses' },
        { icon: 'card-outline', label: 'Payment History', route: '/payments' },
        { icon: 'notifications-outline', label: 'Notification Settings', route: '/settings/notifications' },
        { icon: 'help-circle-outline', label: 'Help & Support', route: '/support' },
        { icon: 'document-text-outline', label: 'Terms & Privacy', route: '/legal' },
    ];

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/');
                    },
                },
            ]
        );
    };

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            customer: 'Customer',
            service_advisor: 'Service Advisor',
            technician: 'Technician',
            driver: 'Driver',
            vendor: 'Vendor',
            admin: 'Administrator',
        };
        return labels[role] || role;
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* Profile Card */}
                <Card style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </Text>
                    </View>
                    <Text style={styles.userName}>{user?.full_name}</Text>
                    <Text style={styles.userRole}>{getRoleLabel(user?.role || 'customer')}</Text>

                    <View style={styles.contactInfo}>
                        <View style={styles.contactItem}>
                            <Ionicons name="call-outline" size={16} color={colors.text.secondary} />
                            <Text style={styles.contactText}>{user?.mobile}</Text>
                        </View>
                        {user?.email && (
                            <View style={styles.contactItem}>
                                <Ionicons name="mail-outline" size={16} color={colors.text.secondary} />
                                <Text style={styles.contactText}>{user?.email}</Text>
                            </View>
                        )}
                    </View>
                </Card>

                {/* Menu Items */}
                <View style={styles.menu}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.menuItem}
                            onPress={() => router.push(item.route as any)}
                        >
                            <View style={styles.menuIcon}>
                                <Ionicons name={item.icon as any} size={22} color={colors.primary[400]} />
                            </View>
                            <Text style={styles.menuLabel}>{item.label}</Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color={colors.error.main} />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={styles.version}>Version 1.0.0</Text>
                <View style={{ height: spacing.xxl }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    profileCard: {
        marginHorizontal: spacing.lg,
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary[500],
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        ...shadows.md,
    },
    avatarText: {
        fontSize: typography.size.xxxl,
        color: '#fff',
        fontWeight: 'bold',
    },
    userName: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: '600',
    },
    userRole: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        marginTop: 4,
        fontWeight: '500',
    },
    contactInfo: {
        marginTop: spacing.md,
        gap: spacing.xs,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    contactText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    menu: {
        margin: spacing.lg,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[800],
    },
    menuIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuLabel: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.lg,
        padding: spacing.md,
        backgroundColor: `${colors.error.main}15`,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
    },
    logoutText: {
        fontSize: typography.size.md,
        color: colors.error.main,
        fontWeight: '600',
    },
    version: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginTop: spacing.xl,
    },
});
