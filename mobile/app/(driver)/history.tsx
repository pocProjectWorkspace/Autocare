/**
 * Driver History Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function HistoryScreen() {
    const [filter, setFilter] = useState<'all' | 'pickups' | 'deliveries'>('all');

    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['driver-history'],
        queryFn: () => jobAPI.list({ status_filter: 'vehicle_picked,delivered,closed', page_size: 50 }),
    });

    const jobs = data?.data?.jobs || [];
    const filteredJobs = filter === 'all' ? jobs :
        filter === 'pickups' ? jobs.filter((j: any) => j.intake_type === 'pickup') :
            jobs.filter((j: any) => j.status === 'delivered');

    const totalPickups = jobs.filter((j: any) => j.intake_type === 'pickup').length;
    const totalDeliveries = jobs.filter((j: any) => j.status === 'delivered').length;

    const renderJob = ({ item: job }: { item: any }) => (
        <Card style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.jobNumber}>{job.job_number}</Text>
                <View style={[styles.badge, job.intake_type === 'pickup' ? styles.pickupBadge : styles.deliveryBadge]}>
                    <Text style={styles.badgeText}>{job.intake_type === 'pickup' ? 'Pickup' : 'Delivery'}</Text>
                </View>
            </View>
            <Text style={styles.customer}>{job.customer_name}</Text>
            <Text style={styles.vehicle}>{job.vehicle_plate}</Text>
            <Text style={styles.time}>{new Date(job.updated_at).toLocaleString()}</Text>
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>History</Text>

            <View style={styles.stats}>
                <View style={styles.stat}><Text style={styles.statVal}>{totalPickups}</Text><Text style={styles.statLabel}>Pickups</Text></View>
                <View style={styles.stat}><Text style={styles.statVal}>{totalDeliveries}</Text><Text style={styles.statLabel}>Deliveries</Text></View>
                <View style={styles.stat}><Text style={styles.statVal}>{jobs.length}</Text><Text style={styles.statLabel}>Total</Text></View>
            </View>

            <View style={styles.filters}>
                {(['all', 'pickups', 'deliveries'] as const).map(f => (
                    <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {isLoading ? <Loading fullScreen /> : (
                <FlatList data={filteredJobs} renderItem={renderJob} keyExtractor={i => i.id}
                    contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    title: { fontSize: 24, color: colors.text.primary, fontWeight: 'bold', padding: spacing.lg },
    stats: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
    stat: { flex: 1, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center' },
    statVal: { fontSize: 20, color: colors.text.primary, fontWeight: 'bold' },
    statLabel: { fontSize: 12, color: colors.text.tertiary },
    filters: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
    filterBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 20, backgroundColor: colors.background.tertiary },
    filterActive: { backgroundColor: colors.primary[500] },
    filterText: { fontSize: 14, color: colors.text.secondary, textTransform: 'capitalize' },
    filterTextActive: { color: '#fff' },
    list: { padding: spacing.lg, paddingTop: 0 },
    card: { marginBottom: spacing.sm },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    jobNumber: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    pickupBadge: { backgroundColor: colors.accent[500] + '30' },
    deliveryBadge: { backgroundColor: colors.primary[500] + '30' },
    badgeText: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
    customer: { fontSize: 14, color: colors.text.secondary },
    vehicle: { fontSize: 13, color: colors.text.tertiary, marginTop: 2 },
    time: { fontSize: 12, color: colors.text.tertiary, marginTop: 4 },
});
