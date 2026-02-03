/**
 * Vendor My Quotes Screen
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { rfqAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function VendorQuotesScreen() {
    const { data, isLoading, refetch, isRefetching } = useQuery({
        queryKey: ['vendor-quotes'],
        queryFn: () => rfqAPI.getMyQuotes(),
    });

    const quotes = data?.data?.quotes || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return colors.warning.main;
            case 'selected': return colors.success.main;
            case 'rejected': return colors.error.main;
            default: return colors.neutral[400];
        }
    };

    const renderQuote = ({ item: quote }: { item: any }) => (
        <Card style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.rfqNumber}>RFQ-{quote.rfq_id?.slice(0, 8).toUpperCase()}</Text>
                <View style={[styles.badge, { backgroundColor: getStatusColor(quote.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getStatusColor(quote.status) }]}>
                        {quote.status.replace('_', ' ')}
                    </Text>
                </View>
            </View>

            <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Quote Amount</Text>
                <Text style={styles.amount}>AED {quote.total_amount?.toFixed(2)}</Text>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.info}>
                    <Ionicons name="cube-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.infoText}>{quote.items_count || 0} items</Text>
                </View>
                <View style={styles.info}>
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.infoText}>{quote.delivery_days || 0} days delivery</Text>
                </View>
            </View>

            <Text style={styles.date}>Submitted: {new Date(quote.created_at).toLocaleDateString()}</Text>

            {quote.status === 'selected' && (
                <View style={styles.selectedBanner}>
                    <Ionicons name="trophy" size={18} color={colors.warning.main} />
                    <Text style={styles.selectedText}>Your quote was selected!</Text>
                </View>
            )}
        </Card>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>My Quotes</Text>

            {isLoading ? <Loading fullScreen /> : quotes.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="pricetag-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No Quotes Yet</Text>
                    <Text style={styles.emptyText}>Submit quotes on open RFQs</Text>
                </View>
            ) : (
                <FlatList
                    data={quotes}
                    renderItem={renderQuote}
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
    rfqNumber: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
    amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    amountLabel: { fontSize: 13, color: colors.text.tertiary },
    amount: { fontSize: 20, color: colors.accent[400], fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.sm },
    info: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { fontSize: 13, color: colors.text.tertiary },
    date: { fontSize: 12, color: colors.text.tertiary },
    selectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, padding: spacing.sm, backgroundColor: colors.warning.main + '15', borderRadius: borderRadius.md },
    selectedText: { fontSize: 14, color: colors.warning.main, fontWeight: '600' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
    emptyTitle: { fontSize: 18, color: colors.text.primary, fontWeight: '600', marginTop: spacing.lg },
    emptyText: { fontSize: 14, color: colors.text.tertiary, marginTop: 8 },
});
