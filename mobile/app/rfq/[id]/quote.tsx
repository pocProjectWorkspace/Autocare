/**
 * Quote Submission Screen for Vendors
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Card, Loading, Input } from '@/components/ui';
import { rfqAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

interface QuoteItem {
    part_id: string;
    part_name: string;
    quantity: number;
    unit_price: string;
    notes: string;
}

export default function SubmitQuoteScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const { data, isLoading } = useQuery({
        queryKey: ['rfq-detail', id],
        queryFn: () => rfqAPI.get(id!),
        enabled: !!id,
    });

    const [items, setItems] = useState<QuoteItem[]>([]);
    const [deliveryDays, setDeliveryDays] = useState('3');
    const [notes, setNotes] = useState('');
    const [validity, setValidity] = useState('7');

    const submitMutation = useMutation({
        mutationFn: (data: any) => rfqAPI.submitQuote(id!, data),
        onSuccess: () => {
            Alert.alert('Success', 'Quote submitted successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        },
        onError: (error: any) => {
            Alert.alert('Error', error.message || 'Failed to submit quote');
        },
    });

    const rfq = data?.data;

    React.useEffect(() => {
        if (rfq?.parts) {
            setItems(rfq.parts.map((p: any) => ({
                part_id: p.id,
                part_name: p.name,
                quantity: p.quantity,
                unit_price: '',
                notes: '',
            })));
        }
    }, [rfq]);

    const updateItem = (index: number, field: keyof QuoteItem, value: string) => {
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => {
            const price = parseFloat(item.unit_price) || 0;
            return sum + (price * item.quantity);
        }, 0);
    };

    const handleSubmit = () => {
        const incomplete = items.some(item => !item.unit_price || parseFloat(item.unit_price) <= 0);
        if (incomplete) {
            Alert.alert('Error', 'Please provide prices for all items');
            return;
        }

        const quoteData = {
            items: items.map(item => ({
                part_id: item.part_id,
                unit_price: parseFloat(item.unit_price),
                quantity: item.quantity,
                notes: item.notes,
            })),
            delivery_days: parseInt(deliveryDays) || 3,
            validity_days: parseInt(validity) || 7,
            notes,
            total_amount: calculateTotal(),
        };

        submitMutation.mutate(quoteData);
    };

    if (isLoading) return <Loading fullScreen />;

    if (!rfq) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.error}>RFQ not found</Text>
                <Button title="Go Back" onPress={() => router.back()} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Button variant="ghost" onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                    </Button>
                    <Text style={styles.title}>Submit Quote</Text>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <Card style={styles.rfqInfo}>
                        <Text style={styles.rfqNumber}>RFQ-{id?.slice(0, 8).toUpperCase()}</Text>
                        <Text style={styles.jobNumber}>Job: {rfq.job_number}</Text>
                        <Text style={styles.deadline}>Deadline: {new Date(rfq.deadline).toLocaleDateString()}</Text>
                    </Card>

                    <Text style={styles.sectionTitle}>Parts to Quote</Text>

                    {items.map((item, index) => (
                        <Card key={item.part_id} style={styles.partCard}>
                            <View style={styles.partHeader}>
                                <Text style={styles.partName}>{item.part_name}</Text>
                                <Text style={styles.qty}>Qty: {item.quantity}</Text>
                            </View>

                            <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Unit Price (AED)</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    value={item.unit_price}
                                    onChangeText={(val) => updateItem(index, 'unit_price', val)}
                                    keyboardType="decimal-pad"
                                    placeholder="0.00"
                                    placeholderTextColor={colors.neutral[500]}
                                />
                            </View>

                            <Text style={styles.subtotal}>
                                Subtotal: AED {((parseFloat(item.unit_price) || 0) * item.quantity).toFixed(2)}
                            </Text>

                            <TextInput
                                style={styles.notesInput}
                                value={item.notes}
                                onChangeText={(val) => updateItem(index, 'notes', val)}
                                placeholder="Notes (optional)"
                                placeholderTextColor={colors.neutral[500]}
                            />
                        </Card>
                    ))}

                    <Card style={styles.deliveryCard}>
                        <View style={styles.deliveryRow}>
                            <Text style={styles.deliveryLabel}>Delivery Days</Text>
                            <TextInput
                                style={styles.smallInput}
                                value={deliveryDays}
                                onChangeText={setDeliveryDays}
                                keyboardType="number-pad"
                            />
                        </View>
                        <View style={styles.deliveryRow}>
                            <Text style={styles.deliveryLabel}>Quote Valid (days)</Text>
                            <TextInput
                                style={styles.smallInput}
                                value={validity}
                                onChangeText={setValidity}
                                keyboardType="number-pad"
                            />
                        </View>
                    </Card>

                    <TextInput
                        style={styles.notesField}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Additional notes for garage..."
                        placeholderTextColor={colors.neutral[500]}
                        multiline
                        numberOfLines={3}
                    />

                    <View style={styles.totalCard}>
                        <Text style={styles.totalLabel}>Total Quote Amount</Text>
                        <Text style={styles.totalAmount}>AED {calculateTotal().toFixed(2)}</Text>
                    </View>

                    <Button
                        title="Submit Quote"
                        onPress={handleSubmit}
                        loading={submitMutation.isPending}
                        fullWidth
                        style={styles.submitBtn}
                    />

                    <View style={{ height: spacing.xxl }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
    backBtn: { marginRight: spacing.sm },
    title: { fontSize: 20, color: colors.text.primary, fontWeight: '600' },
    content: { flex: 1, padding: spacing.lg },
    rfqInfo: { marginBottom: spacing.lg },
    rfqNumber: { fontSize: 18, color: colors.text.primary, fontWeight: '600' },
    jobNumber: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
    deadline: { fontSize: 13, color: colors.warning.main, marginTop: 4 },
    sectionTitle: { fontSize: 16, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.md },
    partCard: { marginBottom: spacing.md },
    partHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
    partName: { fontSize: 15, color: colors.text.primary, fontWeight: '500', flex: 1 },
    qty: { fontSize: 14, color: colors.primary[400], fontWeight: '600' },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    priceLabel: { fontSize: 13, color: colors.text.tertiary },
    priceInput: { width: 120, backgroundColor: colors.background.primary, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text.primary, textAlign: 'right', fontSize: 16, fontWeight: '600' },
    subtotal: { fontSize: 13, color: colors.accent[400], textAlign: 'right', marginTop: 4 },
    notesInput: { backgroundColor: colors.background.primary, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text.secondary, marginTop: spacing.sm, fontSize: 13 },
    deliveryCard: { marginBottom: spacing.md },
    deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    deliveryLabel: { fontSize: 14, color: colors.text.secondary },
    smallInput: { width: 60, backgroundColor: colors.background.primary, borderRadius: borderRadius.md, padding: spacing.sm, color: colors.text.primary, textAlign: 'center' },
    notesField: { backgroundColor: colors.background.tertiary, borderRadius: borderRadius.lg, padding: spacing.md, color: colors.text.secondary, minHeight: 80, marginBottom: spacing.lg },
    totalCard: { backgroundColor: colors.primary[500] + '20', borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    totalLabel: { fontSize: 16, color: colors.text.primary },
    totalAmount: { fontSize: 24, color: colors.accent[400], fontWeight: 'bold' },
    submitBtn: { marginTop: spacing.md },
    error: { fontSize: 16, color: colors.error.main, textAlign: 'center', marginTop: spacing.xxl },
});
