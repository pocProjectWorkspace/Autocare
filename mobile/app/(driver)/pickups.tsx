/**
 * Driver Pickups Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, Loading } from '@/components/ui';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function PickupsScreen() {
    const queryClient = useQueryClient();
    const [selectedTab, setSelectedTab] = useState<'pending' | 'completed'>('pending');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['driver-pickups'],
        queryFn: () => jobAPI.list({ status_filter: 'scheduled,vehicle_picked' }),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ jobId, status }: { jobId: string; status: string }) =>
            jobAPI.updateStatus(jobId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-pickups'] });
            Alert.alert('Success', 'Status updated!');
        },
    });

    const jobs = data?.data?.jobs || [];
    const pendingPickups = jobs.filter((j: any) => j.status === 'scheduled' && j.intake_type === 'pickup');
    const completedPickups = jobs.filter((j: any) => j.status === 'vehicle_picked');

    const displayJobs = selectedTab === 'pending' ? pendingPickups : completedPickups;

    const handleCall = (phone: string) => {
        Linking.openURL(`tel:${phone}`);
    };

    const handleNavigate = (address: string) => {
        const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
        Linking.openURL(url);
    };

    const handleStartPickup = (jobId: string) => {
        Alert.alert(
            'Start Pickup',
            'Confirm you are heading to pickup location?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => updateStatusMutation.mutate({ jobId, status: 'en_route_pickup' }) },
            ]
        );
    };

    const handlePickedUp = (jobId: string) => {
        Alert.alert(
            'Vehicle Picked Up',
            'Confirm vehicle has been picked up?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: () => updateStatusMutation.mutate({ jobId, status: 'vehicle_picked' }) },
            ]
        );
    };

    const renderPickupCard = ({ item: job }: { item: any }) => (
        <Card style={styles.pickupCard}>
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.jobNumber}>{job.job_number}</Text>
                    <Text style={styles.customerName}>{job.customer_name}</Text>
                </View>
                <View style={[styles.statusBadge, job.status === 'scheduled' ? styles.pendingBadge : styles.completedBadge]}>
                    <Text style={styles.statusText}>
                        {job.status === 'scheduled' ? 'Pending' : 'Picked Up'}
                    </Text>
                </View>
            </View>

            <View style={styles.vehicleInfo}>
                <Ionicons name="car" size={18} color={colors.primary[400]} />
                <Text style={styles.vehiclePlate}>{job.vehicle_plate}</Text>
                <Text style={styles.vehicleName}>{job.vehicle_name}</Text>
            </View>

            {job.pickup_address && (
                <View style={styles.addressRow}>
                    <Ionicons name="location" size={18} color={colors.accent[400]} />
                    <Text style={styles.addressText} numberOfLines={2}>{job.pickup_address}</Text>
                </View>
            )}

            {job.scheduled_time && (
                <View style={styles.timeRow}>
                    <Ionicons name="time" size={18} color={colors.warning.main} />
                    <Text style={styles.timeText}>
                        {new Date(job.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    onPress={() => handleNavigate(job.pickup_address || job.customer_address)}
                >
                    <Ionicons name="navigate" size={20} color={colors.info} />
                </TouchableOpacity>

                {job.status === 'scheduled' && (
                    <>
                        <Button
                            title="Start"
                            variant="outline"
                            size="sm"
                            onPress={() => handleStartPickup(job.id)}
                            style={{ flex: 1, marginLeft: spacing.sm }}
                        />
                        <Button
                            title="Picked Up"
                            size="sm"
                            onPress={() => handlePickedUp(job.id)}
                            loading={updateStatusMutation.isPending}
                            style={{ flex: 1, marginLeft: spacing.sm }}
                        />
                    </>
                )}
            </View>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Pickups</Text>
                <Text style={styles.subtitle}>{pendingPickups.length} pending</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pending' && styles.tabActive]}
                    onPress={() => setSelectedTab('pending')}
                >
                    <Text style={[styles.tabText, selectedTab === 'pending' && styles.tabTextActive]}>
                        Pending ({pendingPickups.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'completed' && styles.tabActive]}
                    onPress={() => setSelectedTab('completed')}
                >
                    <Text style={[styles.tabText, selectedTab === 'completed' && styles.tabTextActive]}>
                        Completed ({completedPickups.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {isLoading ? (
                <Loading fullScreen message="Loading pickups..." />
            ) : displayJobs.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="car-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No pickups</Text>
                    <Text style={styles.emptyText}>
                        {selectedTab === 'pending' ? 'No pending pickups for today' : 'No completed pickups yet'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={displayJobs}
                    renderItem={renderPickupCard}
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
    pickupCard: {
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
    pendingBadge: {
        backgroundColor: colors.warning.main + '20',
    },
    completedBadge: {
        backgroundColor: colors.success.main + '20',
    },
    statusText: {
        fontSize: typography.size.xs,
        fontWeight: '600',
        color: colors.warning.main,
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
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    timeText: {
        fontSize: typography.size.md,
        color: colors.warning.main,
        fontWeight: '500',
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
