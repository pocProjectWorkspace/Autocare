/**
 * Driver Deliveries Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Loading } from '@/components/ui';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function DeliveriesScreen() {
    const queryClient = useQueryClient();
    const [selectedTab, setSelectedTab] = useState<'pending' | 'completed'>('pending');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['driver-deliveries'],
        queryFn: () => jobAPI.list({ status_filter: 'ready,out_for_delivery,delivered' }),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
            jobAPI.updateStatus(jobId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-deliveries'] });
            Alert.alert('Success', 'Status updated!');
        },
    });

    const jobs = data?.data?.jobs || [];
    const pendingDeliveries = jobs.filter((j: any) => ['ready', 'out_for_delivery'].includes(j.status));
    const completedDeliveries = jobs.filter((j: any) => j.status === 'delivered');

    const displayJobs = selectedTab === 'pending' ? pendingDeliveries : completedDeliveries;

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleNavigate = (address: string) => {
        const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
        Linking.openURL(url);
    };

    const handleStartDelivery = (jobId: string) => {
        Alert.alert(
            'Start Delivery',
            'Confirm you are heading to delivery location?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => updateStatusMutation.mutate({ jobId, status: 'out_for_delivery' }) },
            ]
        );
    };

    const handleDelivered = (jobId: string) => {
        Alert.alert(
            'Vehicle Delivered',
            'Confirm vehicle has been delivered to customer?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => updateStatusMutation.mutate({ jobId, status: 'delivered' }) },
            ]
        );
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'ready': return 'Ready for Delivery';
            case 'out_for_delivery': return 'En Route';
            case 'delivered': return 'Delivered';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ready': return colors.warning.main;
            case 'out_for_delivery': return colors.info;
            case 'delivered': return colors.success.main;
            default: return colors.neutral[400];
        }
    };

    const renderDeliveryCard = ({ item: job }: { item: any }) => (
        <Card style={styles.deliveryCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.jobNumber}>{job.job_number}</Text>
                    <Text style={styles.customerName}>{job.customer_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                        {getStatusLabel(job.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.vehicleInfo}>
                <Ionicons name="car" size={18} color={colors.primary[400]} />
                <Text style={styles.vehiclePlate}>{job.vehicle_plate}</Text>
                <Text style={styles.vehicleName}>{job.vehicle_name}</Text>
            </View>

            {job.delivery_address && (
                <View style={styles.addressRow}>
                    <Ionicons name="location" size={18} color={colors.accent[400]} />
                    <Text style={styles.addressText} numberOfLines={2}>{job.delivery_address}</Text>
                </View>
            )}

            {/* Payment Info */}
            {job.balance_due > 0 && (
                <View style={styles.paymentInfo}>
                    <Ionicons name="card" size={18} color={colors.error.main} />
                    <Text style={styles.paymentText}>
                        Collect: <Text style={styles.paymentAmount}>AED {job.balance_due.toFixed(2)}</Text>
                    </Text>
                </View>
            )}

            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall(job.customer_mobile)}
                >
                    <Ionicons name="call" size={20} color={colors.success.main} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleNavigate(job.delivery_address || job.customer_address)}
                >
                    <Ionicons name="navigate" size={20} color={colors.info} />
                </TouchableOpacity>

                {job.status === 'ready' && (
                    <Button
                        title="Start Delivery"
                        size="sm"
                        onPress={() => handleStartDelivery(job.id)}
                        loading={updateStatusMutation.isPending}
                        style={{ flex: 1, marginLeft: spacing.sm }}
                    />
                )}

                {job.status === 'out_for_delivery' && (
                    <Button
                        title="Mark Delivered"
                        size="sm"
                        onPress={() => handleDelivered(job.id)}
                        loading={updateStatusMutation.isPending}
                        style={{ flex: 1, marginLeft: spacing.sm }}
                    />
                )}
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Deliveries</Text>
                <Text style={styles.subtitle}>{pendingDeliveries.length} pending</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
                    onPress={() => setSelectedTab('pending')}
                >
                    <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
                        Pending ({pendingDeliveries.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
                    onPress={() => setSelectedTab('completed')}
                >
                    <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
                        Completed ({completedDeliveries.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <Loading fullScreen message="Loading deliveries..." />
            ) : displayJobs.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="bicycle-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No deliveries</Text>
                    <Text style={styles.emptyText}>
                        {selectedTab === 'pending' ? 'No pending deliveries' : 'No completed deliveries yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayJobs}
                    renderItem={renderDeliveryCard}
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
        paddingBottom: spacing.sm,
    },
    title: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginTop: 2,
    },
    tabs: {
        flexDirection: 'row',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.tertiary,
        alignItems: 'center',
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
    deliveryCard: {
        marginBottom: spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    jobNumber: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    customerName: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statusText: {
        fontSize: typography.size.xs,
        fontWeight: '600',
    },
    vehicleInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    vehiclePlate: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    vehicleName: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    addressText: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    paymentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        backgroundColor: colors.error.main + '15',
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },
    paymentText: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
    },
    paymentAmount: {
        color: colors.error.main,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
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
        textAlign: 'center',
    },
});
