/**
 * Vendor RFQ List Screen
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { rfqAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function VendorRFQScreen() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['vendor-rfqs'],
        queryFn: () => rfqAPI.getVendorRFQs(),
    });

    const rfqs = data?.data?.rfqs || [];
    const openRfqs = rfqs.filter((r: any) => r.status === 'open');

    const renderRFQ = ({ item: rfq }: { item: any }) => (
        <Card style={styles.rfqCard} onPress={() => router.push(`/rfq/${rfq.id}`)}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.rfqNumber}>RFQ-{rfq.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.jobNumber}>{rfq.job_number}</Text>
                </View>
                <View style={[styles.statusBadge, rfq.status === 'open' ? styles.openBadge : styles.closedBadge]}>
                    <Text style={styles.statusText}>{rfq.status === 'open' ? 'Open' : 'Closed'}</Text>
                </View>
            </View>

            <View style={styles.partsSection}>
                <Text style={styles.partsTitle}>Parts Requested:</Text>
                {rfq.parts?.slice(0, 3).map((part: any, i: number) => (
                    <Text key={i} style={styles.partItem}>• {part.name} x{part.quantity}</Text>
                ))}
                {rfq.parts?.length > 3 && (
                    <Text style={styles.moreParts}>+{rfq.parts.length - 3} more parts</Text>
                )}
            </View>

            <View style={styles.footer}>
                <View style={styles.timeInfo}>
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.timeText}>
                        Expires: {new Date(rfq.deadline).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.quoteInfo}>
                    <Ionicons name="pricetags-outline" size={14} color={colors.primary[400]} />
                    <Text style={styles.quoteText}>{rfq.quote_count || 0} quotes</Text>
                </View>
            </View>

            {rfq.status === 'open' && !rfq.my_quote && (
                <TouchableOpacity style={styles.submitBtn} onPress={() => router.push(`/rfq/${rfq.id}/quote`)}>
                    <Text style={styles.submitBtnText}>Submit Quote</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
            )}

            {rfq.my_quote && (
                <View style={styles.quotedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
                    <Text style={styles.quotedText}>Quote Submitted: AED {rfq.my_quote.total_amount}</Text>
                </View>
            )}
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerSection}>
                <Text style={styles.title}>Open RFQs</Text>
                <Text style={styles.subtitle}>{openRfqs.length} requests awaiting quotes</Text>
            </View>

            {isLoading ? <Loading fullScreen message="Loading RFQs..." /> : rfqs.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="document-text-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No RFQs Available</Text>
                    <Text style={styles.emptyText}>New part requests will appear here</Text>
                </View>
            ) : (
                <FlatList
                    data={rfqs}
                    renderItem={renderRFQ}
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
    headerSection: { padding: spacing.lg },
    title: { fontSize: 24, color: colors.text.primary, fontWeight: 'bold' },
    subtitle: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
    list: { padding: spacing.lg, paddingTop: 0 },
    rfqCard: { marginBottom: spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
    rfqNumber: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    jobNumber: { fontSize: 13, color: colors.text.tertiary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    openBadge: { backgroundColor: colors.success.main + '20' },
    closedBadge: { backgroundColor: colors.neutral[600] + '20' },
    statusText: { fontSize: 12, fontWeight: '600', color: colors.success.main },
    partsSection: { marginBottom: spacing.md, padding: spacing.sm, backgroundColor: colors.background.primary, borderRadius: borderRadius.md },
    partsTitle: { fontSize: 12, color: colors.text.tertiary, marginBottom: 4 },
    partItem: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
    moreParts: { fontSize: 12, color: colors.primary[400], marginTop: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between' },
    timeInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { fontSize: 12, color: colors.text.tertiary },
    quoteInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    quoteText: { fontSize: 12, color: colors.primary[400] },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary[500], padding: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.md },
    submitBtnText: { color: '#fff', fontWeight: '600' },
    quotedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.success.main + '15', borderRadius: borderRadius.md },
    quotedText: { fontSize: 13, color: colors.success.main, fontWeight: '500' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
    emptyTitle: { fontSize: 18, color: colors.text.primary, fontWeight: '600', marginTop: spacing.lg },
    emptyText: { fontSize: 14, color: colors.text.tertiary, marginTop: 8 },
});
