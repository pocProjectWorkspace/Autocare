/**
 * Staff Dashboard Screen
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Loading } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

export default function DashboardScreen() {
    const user = useAuthStore((state) => state.user);

    const { data: recentJobs, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['jobs', 'recent'],
        queryFn: () => jobAPI.list({ page_size: 10 }),
    });

    const jobs = recentJobs?.data?.jobs || [];

    // Mock stats - in production these would come from the API
    const stats = [
        { label: 'Pending', value: '12', icon: 'time-outline', color: colors.warning.main },
        { label: 'In Progress', value: '8', icon: 'construct-outline', color: colors.primary[400] },
        { label: 'Today', value: '5', icon: 'calendar-outline', color: colors.accent[400] },
        { label: 'Completed', value: '23', icon: 'checkmark-circle-outline', color: colors.success.main },
    ];

    const quickActions = [
        { icon: 'add-circle-outline', label: 'New Job', route: '/jobs/new' },
        { icon: 'search-outline', label: 'Find Job', route: '/jobs/search' },
        { icon: 'qr-code-outline', label: 'Scan QR', route: '/scan' },
        { icon: 'bar-chart-outline', label: 'Reports', route: '/reports' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Welcome,</Text>
                        <Text style={styles.userName}>{user?.full_name?.split(' ')[0]} 👋</Text>
                    </View>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>
                            {user?.role === 'service_advisor' ? 'Service Advisor' :
                                user?.role === 'technician' ? 'Technician' :
                                    user?.role === 'admin' ? 'Admin' : 'Staff'}
                        </Text>
                    </View>
                </View>

                {/* Stats */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <LinearGradient
                            key={index}
                            colors={[colors.background.tertiary, colors.background.elevated]}
                            style={styles.statCard}
                        >
                            <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </LinearGradient>
                    ))}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionsGrid}>
                        {quickActions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.actionButton}
                                onPress={() => router.push(action.route as any)}
                            >
                                <View style={styles.actionIcon}>
                                    <Ionicons name={action.icon as any} size={28} color={colors.primary[400]} />
                                </View>
                                <Text style={styles.actionLabel}>{action.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Recent Jobs */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Jobs</Text>
                        <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                            <Text style={styles.seeAll}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <Loading message="Loading..." />
                    ) : jobs.length === 0 ? (
                        <Card style={styles.emptyCard}>
                            <Text style={styles.emptyText}>No jobs found</Text>
                        </Card>
                    ) : (
                        jobs.slice(0, 5).map((job: any) => (
                            <Card key={job.id} style={styles.jobCard} onPress={() => router.push(`/job/${job.id}`)}>
                                <View style={styles.jobHeader}>
                                    <View style={styles.jobInfo}>
                                        <Text style={styles.jobNumber}>{job.job_number}</Text>
                                        <Text style={styles.jobCustomer}>{job.customer_name}</Text>
                                    </View>
                                    <StatusBadge status={job.status} size="sm" />
                                </View>
                                <View style={styles.jobFooter}>
                                    <View style={styles.vehicleInfo}>
                                        <Ionicons name="car-outline" size={16} color={colors.text.tertiary} />
                                        <Text style={styles.vehicleText}>{job.vehicle_plate}</Text>
                                    </View>
                                    <Text style={styles.timeText}>
                                        {new Date(job.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </Card>
                        ))
                    )}
                </View>

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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
    },
    greeting: {
        fontSize: typography.size.lg,
        color: colors.text.secondary,
    },
    userName: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    roleBadge: {
        backgroundColor: colors.primary[500] + '20',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    roleText: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: spacing.lg,
        gap: spacing.md,
    },
    statCard: {
        width: '47%',
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    statValue: {
        fontSize: typography.size.xxxl,
        color: colors.text.primary,
        fontWeight: 'bold',
        marginTop: spacing.sm,
    },
    statLabel: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    actionButton: {
        alignItems: 'center',
        width: '22%',
    },
    actionIcon: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    actionLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        color: colors.text.tertiary,
        fontSize: typography.size.md,
    },
    jobCard: {
        marginBottom: spacing.md,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    jobInfo: {
        flex: 1,
    },
    jobNumber: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    jobCustomer: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    vehicleText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    timeText: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
});
