/**
 * Jobs List Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Loading } from '@/components/ui';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { SERVICE_TYPE_LABELS } from '@/constants/config';

const tabs = [
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Completed' },
    { key: 'all', label: 'All' },
];

const statusFilters: Record<string, string> = {
    active: 'requested,scheduled,vehicle_picked,in_intake,diagnosed,awaiting_estimate_approval,estimate_approved,rfq_sent,quotes_received,awaiting_parts_approval,parts_approved,awaiting_payment,partially_paid,paid,parts_ordered,parts_received,in_service,testing,ready,out_for_delivery',
    completed: 'delivered,closed',
    all: '',
};

export default function JobsScreen() {
    const [activeTab, setActiveTab] = useState('active');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['jobs', activeTab],
        queryFn: () => jobAPI.list({
            status_filter: statusFilters[activeTab] || undefined,
            page_size: 50,
        }),
    });

    const jobs = data?.data?.jobs || [];

    const renderJob = ({ item: job }: { item: any }) => (
        <Card style={styles.jobCard} onPress={() => router.push(`/job/${job.id}`)}>
            <View style={styles.jobHeader}>
                <View style={styles.jobInfo}>
                    <Text style={styles.jobNumber}>{job.job_number}</Text>
                    <Text style={styles.jobDate}>
                        {new Date(job.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <StatusBadge status={job.status} />
            </View>

            <View style={styles.jobBody}>
                <View style={styles.vehicleInfo}>
                    <Ionicons name="car-outline" size={20} color={colors.text.secondary} />
                    <View style={{ marginLeft: spacing.sm }}>
                        <Text style={styles.vehiclePlate}>{job.vehicle_plate}</Text>
                        <Text style={styles.vehicleName}>{job.vehicle_name}</Text>
                    </View>
                </View>

                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceType}>{SERVICE_TYPE_LABELS[job.service_type]}</Text>
                    {job.grand_total > 0 && (
                        <Text style={styles.amount}>AED {job.grand_total.toFixed(2)}</Text>
                    )}
                </View>
            </View>

            <View style={styles.jobFooter}>
                <TouchableOpacity style={styles.viewButton}>
                    <Text style={styles.viewButtonText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.primary[400]} />
                </TouchableOpacity>
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Jobs</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? (
                <Loading fullScreen message="Loading jobs..." />
            ) : jobs.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="clipboard-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No jobs found</Text>
                    <Text style={styles.emptyText}>
                        {activeTab === 'active' ? "You don't have any active jobs" : "No jobs in this category"}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={jobs}
                    renderItem={renderJob}
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
        padding: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    tab: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.background.tertiary,
    },
    tabActive: {
        backgroundColor: colors.primary[500],
    },
    tabText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#fff',
    },
    list: {
        padding: spacing.lg,
        paddingTop: 0,
    },
    jobCard: {
        marginBottom: spacing.md,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    jobInfo: {
        flex: 1,
    },
    jobNumber: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    jobDate: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    jobBody: {
        gap: spacing.md,
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    vehiclePlate: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '500',
    },
    vehicleName: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    serviceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    serviceType: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    amount: {
        fontSize: typography.size.lg,
        color: colors.accent[400],
        fontWeight: '600',
    },
    jobFooter: {
        marginTop: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    viewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    viewButtonText: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
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
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
