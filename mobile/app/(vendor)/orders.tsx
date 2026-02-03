/**
 * Vendor Orders Screen
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { rfqAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function VendorOrdersScreen() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['vendor-orders'],
        queryFn: () => rfqAPI.getVendorOrders(),
    });

    const orders = data?.data?.orders || [];

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { color: colors.warning.main, icon: 'time-outline' };
            case 'confirmed': return { color: colors.info, icon: 'checkmark-circle-outline' };
            case 'shipped': return { color: colors.primary[400], icon: 'airplane-outline' };
            case 'delivered': return { color: colors.success.main, icon: 'checkmark-done-circle-outline' };
            default: return { color: colors.neutral[400], icon: 'help-outline' };
        }
    };

    const renderOrder = ({ item: order }: { item: any }) => {
        const status = getStatusInfo(order.status);
        return (
            <Card style={styles.card}>
                <View style={styles.header}>
                    <Text style={styles.orderNumber}>Order #{order.id?.slice(0, 8).toUpperCase()}</Text>
                    <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
                        <Ionicons name={status.icon as any} size={14} color={status.color} />
                        <Text style={[styles.badgeText, { color: status.color }]}>{order.status}</Text>
                    </View>
                </View>

                <Text style={styles.jobNumber}>Job: {order.job_number}</Text>

                <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>Items:</Text>
                    {order.items?.slice(0, 2).map((item: any, i: number) => (
                        <Text key={i} style={styles.itemText}>• {item.name} x{item.quantity}</Text>
                    ))}
                    {order.items?.length > 2 && <Text style={styles.moreItems}>+{order.items.length - 2} more</Text>}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.amount}>AED {order.total_amount?.toFixed(2)}</Text>
                    <Text style={styles.date}>{new Date(order.created_at).toLocaleDateString()}</Text>
                </View>
            </Card>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Orders</Text>

            {isLoading ? <Loading fullScreen /> : orders.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="cube-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No Orders Yet</Text>
                    <Text style={styles.emptyText}>When your quotes are selected, orders will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={orders}
                    renderItem={renderOrder}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    title: { fontSize: 24, color: colors.text.primary, fontWeight: 'bold', padding: spacing.lg },
    list: { padding: spacing.lg, paddingTop: 0 },
    card: { marginBottom: spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    orderNumber: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
    jobNumber: { fontSize: 13, color: colors.text.tertiary, marginBottom: spacing.sm },
    itemsSection: { padding: spacing.sm, backgroundColor: colors.background.primary, borderRadius: borderRadius.md, marginBottom: spacing.sm },
    itemsTitle: { fontSize: 12, color: colors.text.tertiary, marginBottom: 4 },
    itemText: { fontSize: 13, color: colors.text.secondary },
    moreItems: { fontSize: 12, color: colors.primary[400], marginTop: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amount: { fontSize: 18, color: colors.accent[400], fontWeight: 'bold' },
    date: { fontSize: 12, color: colors.text.tertiary },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
    emptyTitle: { fontSize: 18, color: colors.text.primary, fontWeight: '600', marginTop: spacing.lg },
    emptyText: { fontSize: 14, color: colors.text.tertiary, marginTop: 8, textAlign: 'center' },
});
