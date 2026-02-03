/**
 * Job Detail Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, StatusBadge, Loading } from '@/components/ui';
import JobTimeline from '@/components/JobTimeline';
import AddUpdateModal from '@/components/AddUpdateModal';
import { jobAPI, paymentAPI } from '@/services';
import { useAuthStore } from '@/stores';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { SERVICE_TYPE_LABELS, JOB_STATUS_LABELS } from '@/constants/config';

export default function JobDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const queryClient = useQueryClient();
    const [showEstimate, setShowEstimate] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['job', id],
        queryFn: () => jobAPI.get(id!),
        enabled: !!id,
    });

    const approveMutation = useMutation({
        mutationFn: ({ approved }: { approved: boolean }) => jobAPI.approveEstimate(id!, approved),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job', id] });
            Alert.alert('Success', 'Response submitted!');
        },
    });

    const job = data?.data;

    if (isLoading) {
        return <Loading fullScreen message="Loading job details..." />;
    }

    if (!job) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.error}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.error.main} />
                    <Text style={styles.errorText}>Job not found</Text>
                    <Button title="Go Back" variant="outline" onPress={() => router.back()} />
                </View>
            </SafeAreaView>
        );
    }

    const isCustomer = user?.role === 'customer';
    const needsApproval = job.status === 'awaiting_estimate_approval' || job.status === 'awaiting_parts_approval';
    const needsPayment = job.status === 'awaiting_payment' || job.status === 'partially_paid';

    const handleApprove = (approved: boolean) => {
        Alert.alert(
            approved ? 'Approve Estimate' : 'Reject Estimate',
            approved
                ? 'Are you sure you want to approve this estimate and proceed with the service?'
                : 'Are you sure you want to reject this estimate?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: approved ? 'Approve' : 'Reject', onPress: () => approveMutation.mutate({ approved }) },
            ]
        );
    };

    const handlePayment = async () => {
        try {
            const response = await paymentAPI.createPaymentLink(id!, job.balance_due);
            if (response.data.payment_url) {
                Linking.openURL(response.data.payment_url);
            }
        } catch (err) {
            Alert.alert('Error', 'Failed to create payment link');
        }
    };

    const handleCallBranch = () => {
        if (job.branch?.phone) {
            Linking.openURL(`tel:${job.branch.phone}`);
        }
    };

    const statusSteps = [
        { key: 'requested', label: 'Requested' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'in_intake', label: 'Intake' },
        { key: 'diagnosed', label: 'Diagnosed' },
        { key: 'in_service', label: 'In Service' },
        { key: 'ready', label: 'Ready' },
        { key: 'delivered', label: 'Delivered' },
    ];

    const currentStepIndex = statusSteps.findIndex(s => s.key === job.status) || 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Job Details</Text>
                <TouchableOpacity onPress={() => refetch()}>
                    <Ionicons name="refresh" size={24} color={colors.text.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Status Banner */}
                <LinearGradient
                    colors={[colors.background.tertiary, colors.background.elevated]}
                    style={styles.statusBanner}
                >
                    <View style={styles.statusHeader}>
                        <Text style={styles.jobNumber}>{job.job_number}</Text>
                        <StatusBadge status={job.status} />
                    </View>

                    {/* Progress Steps */}
                    <View style={styles.progressContainer}>
                        {statusSteps.map((step, index) => (
                            <View key={step.key} style={styles.progressStep}>
                                <View style={[
                                    styles.progressDot,
                                    index <= currentStepIndex && styles.progressDotActive,
                                    index < currentStepIndex && styles.progressDotComplete,
                                ]}>
                                    {index < currentStepIndex && (
                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                    )}
                                </View>
                                {index < statusSteps.length - 1 && (
                                    <View style={[
                                        styles.progressLine,
                                        index < currentStepIndex && styles.progressLineActive,
                                    ]} />
                                )}
                            </View>
                        ))}
                    </View>
                </LinearGradient>

                {/* Vehicle Info */}
                <Card style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="car" size={20} color={colors.primary[400]} />
                        <Text style={styles.sectionTitle}>Vehicle</Text>
                    </View>
                    <Text style={styles.vehiclePlate}>{job.vehicle_plate}</Text>
                    <Text style={styles.vehicleName}>{job.vehicle_name}</Text>
                </Card>

                {/* Service Info */}
                <Card style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="construct" size={20} color={colors.primary[400]} />
                        <Text style={styles.sectionTitle}>Service Details</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Service Type</Text>
                        <Text style={styles.infoValue}>{SERVICE_TYPE_LABELS[job.service_type]}</Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Branch</Text>
                        <Text style={styles.infoValue}>{job.branch_name}</Text>
                    </View>

                    {job.scheduled_date && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Scheduled</Text>
                            <Text style={styles.infoValue}>
                                {new Date(job.scheduled_date).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {job.customer_notes && (
                        <View style={styles.notes}>
                            <Text style={styles.notesLabel}>Your Notes:</Text>
                            <Text style={styles.notesText}>{job.customer_notes}</Text>
                        </View>
                    )}
                </Card>

                {/* Cost Breakdown */}
                {job.grand_total > 0 && (
                    <Card style={styles.section}>
                        <TouchableOpacity
                            style={styles.sectionHeader}
                            onPress={() => setShowEstimate(!showEstimate)}
                        >
                            <Ionicons name="receipt" size={20} color={colors.primary[400]} />
                            <Text style={styles.sectionTitle}>Cost Breakdown</Text>
                            <Ionicons
                                name={showEstimate ? 'chevron-up' : 'chevron-down'}
                                size={20}
                                color={colors.text.secondary}
                            />
                        </TouchableOpacity>

                        {showEstimate && (
                            <>
                                <View style={styles.costRow}>
                                    <Text style={styles.costLabel}>Labour</Text>
                                    <Text style={styles.costValue}>AED {job.labour_total?.toFixed(2) || '0.00'}</Text>
                                </View>
                                <View style={styles.costRow}>
                                    <Text style={styles.costLabel}>Parts</Text>
                                    <Text style={styles.costValue}>AED {job.parts_total?.toFixed(2) || '0.00'}</Text>
                                </View>
                                {job.pickup_delivery_fee > 0 && (
                                    <View style={styles.costRow}>
                                        <Text style={styles.costLabel}>Pickup/Delivery</Text>
                                        <Text style={styles.costValue}>AED {job.pickup_delivery_fee.toFixed(2)}</Text>
                                    </View>
                                )}
                                {job.discount_amount > 0 && (
                                    <View style={styles.costRow}>
                                        <Text style={styles.costLabel}>Discount</Text>
                                        <Text style={[styles.costValue, { color: colors.success.main }]}>
                                            -AED {job.discount_amount.toFixed(2)}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.costRow}>
                                    <Text style={styles.costLabel}>Tax (5%)</Text>
                                    <Text style={styles.costValue}>AED {job.tax_amount?.toFixed(2) || '0.00'}</Text>
                                </View>
                            </>
                        )}

                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>AED {job.grand_total.toFixed(2)}</Text>
                        </View>

                        {job.amount_paid > 0 && (
                            <>
                                <View style={styles.costRow}>
                                    <Text style={styles.costLabel}>Paid</Text>
                                    <Text style={[styles.costValue, { color: colors.success.main }]}>
                                        -AED {job.amount_paid.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.totalRow}>
                                    <Text style={styles.totalLabel}>Balance Due</Text>
                                    <Text style={[styles.totalValue, { color: colors.warning.main }]}>
                                        AED {job.balance_due.toFixed(2)}
                                    </Text>
                                </View>
                            </>
                        )}
                    </Card>
                )}

                {/* Actions */}
                {isCustomer && needsApproval && (
                    <Card style={styles.actionCard}>
                        <Text style={styles.actionTitle}>Action Required</Text>
                        <Text style={styles.actionText}>
                            Please review the estimate and approve or request changes.
                        </Text>
                        <View style={styles.actionButtons}>
                            <Button
                                title="Reject"
                                variant="outline"
                                onPress={() => handleApprove(false)}
                                style={{ flex: 1, marginRight: spacing.sm }}
                            />
                            <Button
                                title="Approve"
                                onPress={() => handleApprove(true)}
                                loading={approveMutation.isPending}
                                style={{ flex: 1 }}
                            />
                        </View>
                    </Card>
                )}

                {isCustomer && needsPayment && job.balance_due > 0 && (
                    <Card style={styles.actionCard}>
                        <Text style={styles.actionTitle}>Payment Required</Text>
                        <Text style={styles.actionText}>
                            Complete payment to proceed with service.
                        </Text>
                        <Button
                            title={`Pay AED ${job.balance_due.toFixed(2)}`}
                            onPress={handlePayment}
                            fullWidth
                        />
                    </Card>
                )}

                {/* Contact */}
                <View style={styles.contactSection}>
                    <TouchableOpacity style={styles.contactButton} onPress={handleCallBranch}>
                        <Ionicons name="call" size={20} color={colors.primary[400]} />
                        <Text style={styles.contactText}>Call Service Center</Text>
                    </TouchableOpacity>
                </View>

                {/* Timeline / Progress Updates */}
                <View style={[styles.section, { marginTop: spacing.xl }]}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="list" size={20} color={colors.primary[400]} />
                        <Text style={styles.sectionTitle}>Service Timeline</Text>
                        {!isCustomer && (
                            <TouchableOpacity
                                style={styles.addUpdateBtn}
                                onPress={() => setShowUpdateModal(true)}
                            >
                                <Ionicons name="add-circle" size={20} color={colors.primary[400]} />
                                <Text style={styles.addUpdateText}>Add Update</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <JobTimeline updates={job.updates || []} />
                </View>

                <AddUpdateModal
                    visible={showUpdateModal}
                    onClose={() => setShowUpdateModal(false)}
                    jobId={id!}
                />

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
    headerTitle: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    error: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
        gap: spacing.lg,
    },
    errorText: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
    },
    statusBanner: {
        margin: spacing.lg,
        marginTop: 0,
        padding: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.md,
    },
    statusHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    jobNumber: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressStep: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.neutral[700],
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressDotActive: {
        backgroundColor: colors.primary[500],
    },
    progressDotComplete: {
        backgroundColor: colors.success.main,
    },
    progressLine: {
        width: 24,
        height: 2,
        backgroundColor: colors.neutral[700],
    },
    progressLineActive: {
        backgroundColor: colors.success.main,
    },
    section: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        flex: 1,
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    vehiclePlate: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    vehicleName: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginTop: 4,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[800],
    },
    infoLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    infoValue: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '500',
    },
    notes: {
        marginTop: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.background.primary,
        borderRadius: borderRadius.md,
    },
    notesLabel: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginBottom: 4,
    },
    notesText: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        fontStyle: 'italic',
    },
    costRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.xs,
    },
    costLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    costValue: {
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: spacing.md,
        marginTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    totalLabel: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    totalValue: {
        fontSize: typography.size.xl,
        color: colors.accent[400],
        fontWeight: 'bold',
    },
    actionCard: {
        marginHorizontal: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.primary[500] + '15',
        borderWidth: 1,
        borderColor: colors.primary[500],
    },
    actionTitle: {
        fontSize: typography.size.lg,
        color: colors.primary[400],
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    actionText: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    contactSection: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
    },
    contactText: {
        fontSize: typography.size.md,
        color: colors.primary[400],
        fontWeight: '500',
    },
    addUpdateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: spacing.xs,
    },
    addUpdateText: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
    },
});
