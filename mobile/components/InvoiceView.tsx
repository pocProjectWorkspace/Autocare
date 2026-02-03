/**
 * Invoice View Component
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

interface InvoiceData {
    invoiceNumber: string;
    date: string;
    dueDate?: string;

    // Customer
    customerName: string;
    customerMobile: string;
    customerEmail?: string;

    // Vehicle
    vehiclePlate: string;
    vehicleName: string;
    mileage?: number;

    // Job
    jobNumber: string;
    serviceType: string;

    // Items
    labourItems: InvoiceItem[];
    partsItems: InvoiceItem[];

    // Totals
    labourTotal: number;
    partsTotal: number;
    vatRate: number;
    vatAmount: number;
    grandTotal: number;
    amountPaid: number;
    balanceDue: number;

    // Company
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyTRN?: string;
}

interface InvoiceViewProps {
    data: InvoiceData;
    onShare?: () => void;
    onDownload?: () => void;
}

export default function InvoiceView({ data, onShare, onDownload }: InvoiceViewProps) {
    const handleShare = async () => {
        try {
            await Share.share({
                message: `Invoice ${data.invoiceNumber} for ${data.jobNumber}\nTotal: AED ${data.grandTotal.toFixed(2)}\nBalance Due: AED ${data.balanceDue.toFixed(2)}`,
                title: `Invoice ${data.invoiceNumber}`,
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share invoice');
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.companyName}>{data.companyName}</Text>
                    <Text style={styles.companyDetails}>{data.companyAddress}</Text>
                    <Text style={styles.companyDetails}>{data.companyPhone}</Text>
                    {data.companyTRN && <Text style={styles.companyDetails}>TRN: {data.companyTRN}</Text>}
                </View>
                <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceLabel}>INVOICE</Text>
                    <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
                    <Text style={styles.invoiceDate}>Date: {data.date}</Text>
                </View>
            </View>

            {/* Customer & Vehicle */}
            <View style={styles.infoRow}>
                <Card style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Bill To</Text>
                    <Text style={styles.infoName}>{data.customerName}</Text>
                    <Text style={styles.infoText}>{data.customerMobile}</Text>
                    {data.customerEmail && <Text style={styles.infoText}>{data.customerEmail}</Text>}
                </Card>
                <Card style={styles.infoCard}>
                    <Text style={styles.cardTitle}>Vehicle</Text>
                    <Text style={styles.infoName}>{data.vehiclePlate}</Text>
                    <Text style={styles.infoText}>{data.vehicleName}</Text>
                    {data.mileage && <Text style={styles.infoText}>{data.mileage.toLocaleString()} km</Text>}
                </Card>
            </View>

            {/* Job Reference */}
            <View style={styles.jobRef}>
                <Text style={styles.jobRefText}>Job: {data.jobNumber}</Text>
                <Text style={styles.jobRefText}>Service: {data.serviceType}</Text>
            </View>

            {/* Labour Items */}
            {data.labourItems.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Labour</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.descCol]}>Description</Text>
                        <Text style={[styles.tableHeaderText, styles.qtyCol]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, styles.priceCol]}>Price</Text>
                        <Text style={[styles.tableHeaderText, styles.totalCol]}>Total</Text>
                    </View>
                    {data.labourItems.map((item, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.tableText, styles.descCol]}>{item.description}</Text>
                            <Text style={[styles.tableText, styles.qtyCol]}>{item.quantity}</Text>
                            <Text style={[styles.tableText, styles.priceCol]}>{item.unitPrice.toFixed(2)}</Text>
                            <Text style={[styles.tableText, styles.totalCol]}>{item.total.toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Labour Subtotal</Text>
                        <Text style={styles.subtotalValue}>AED {data.labourTotal.toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {/* Parts Items */}
            {data.partsItems.length > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Parts</Text>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderText, styles.descCol]}>Description</Text>
                        <Text style={[styles.tableHeaderText, styles.qtyCol]}>Qty</Text>
                        <Text style={[styles.tableHeaderText, styles.priceCol]}>Price</Text>
                        <Text style={[styles.tableHeaderText, styles.totalCol]}>Total</Text>
                    </View>
                    {data.partsItems.map((item, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.tableText, styles.descCol]}>{item.description}</Text>
                            <Text style={[styles.tableText, styles.qtyCol]}>{item.quantity}</Text>
                            <Text style={[styles.tableText, styles.priceCol]}>{item.unitPrice.toFixed(2)}</Text>
                            <Text style={[styles.tableText, styles.totalCol]}>{item.total.toFixed(2)}</Text>
                        </View>
                    ))}
                    <View style={styles.subtotalRow}>
                        <Text style={styles.subtotalLabel}>Parts Subtotal</Text>
                        <Text style={styles.subtotalValue}>AED {data.partsTotal.toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {/* Totals */}
            <Card style={styles.totalsCard}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>AED {(data.labourTotal + data.partsTotal).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>VAT ({data.vatRate}%)</Text>
                    <Text style={styles.totalValue}>AED {data.vatAmount.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                    <Text style={styles.grandTotalLabel}>Grand Total</Text>
                    <Text style={styles.grandTotalValue}>AED {data.grandTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Amount Paid</Text>
                    <Text style={[styles.totalValue, styles.paidValue]}>AED {data.amountPaid.toFixed(2)}</Text>
                </View>
                {data.balanceDue > 0 && (
                    <View style={styles.totalRow}>
                        <Text style={styles.balanceLabel}>Balance Due</Text>
                        <Text style={styles.balanceValue}>AED {data.balanceDue.toFixed(2)}</Text>
                    </View>
                )}
            </Card>

            {/* Actions */}
            <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                    <Ionicons name="share-outline" size={20} color={colors.primary[400]} />
                    <Text style={styles.actionText}>Share</Text>
                </TouchableOpacity>
                {onDownload && (
                    <TouchableOpacity style={styles.actionBtn} onPress={onDownload}>
                        <Ionicons name="download-outline" size={20} color={colors.primary[400]} />
                        <Text style={styles.actionText}>Download</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ height: spacing.xxl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.neutral[700] },
    companyName: { fontSize: 20, color: colors.text.primary, fontWeight: 'bold' },
    companyDetails: { fontSize: 12, color: colors.text.tertiary, marginTop: 2 },
    invoiceInfo: { alignItems: 'flex-end' },
    invoiceLabel: { fontSize: 10, color: colors.text.tertiary, letterSpacing: 2 },
    invoiceNumber: { fontSize: 16, color: colors.primary[400], fontWeight: '600' },
    invoiceDate: { fontSize: 12, color: colors.text.tertiary, marginTop: 4 },
    infoRow: { flexDirection: 'row', padding: spacing.lg, gap: spacing.md },
    infoCard: { flex: 1, padding: spacing.md },
    cardTitle: { fontSize: 10, color: colors.text.tertiary, letterSpacing: 1, marginBottom: 4 },
    infoName: { fontSize: 14, color: colors.text.primary, fontWeight: '600' },
    infoText: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
    jobRef: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    jobRefText: { fontSize: 12, color: colors.text.tertiary },
    section: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
    sectionTitle: { fontSize: 14, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
    tableHeader: { flexDirection: 'row', backgroundColor: colors.background.tertiary, padding: spacing.sm, borderRadius: borderRadius.sm },
    tableHeaderText: { fontSize: 11, color: colors.text.tertiary, fontWeight: '600' },
    descCol: { flex: 2 },
    qtyCol: { width: 40, textAlign: 'center' },
    priceCol: { width: 70, textAlign: 'right' },
    totalCol: { width: 80, textAlign: 'right' },
    tableRow: { flexDirection: 'row', padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.neutral[800] },
    tableText: { fontSize: 12, color: colors.text.secondary },
    subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: spacing.sm, marginTop: spacing.xs },
    subtotalLabel: { fontSize: 13, color: colors.text.secondary },
    subtotalValue: { fontSize: 13, color: colors.text.primary, fontWeight: '500' },
    totalsCard: { margin: spacing.lg, padding: spacing.lg },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    totalLabel: { fontSize: 14, color: colors.text.secondary },
    totalValue: { fontSize: 14, color: colors.text.primary },
    grandTotalRow: { borderTopWidth: 1, borderTopColor: colors.neutral[700], paddingTop: spacing.md, marginTop: spacing.sm },
    grandTotalLabel: { fontSize: 16, color: colors.text.primary, fontWeight: 'bold' },
    grandTotalValue: { fontSize: 20, color: colors.accent[400], fontWeight: 'bold' },
    paidValue: { color: colors.success.main },
    balanceLabel: { fontSize: 14, color: colors.error.main, fontWeight: '500' },
    balanceValue: { fontSize: 16, color: colors.error.main, fontWeight: 'bold' },
    actions: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, padding: spacing.lg },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, backgroundColor: colors.background.tertiary, borderRadius: borderRadius.md },
    actionText: { fontSize: 14, color: colors.primary[400], fontWeight: '500' },
});
