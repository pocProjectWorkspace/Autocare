/**
 * Service Booking Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Loading } from '@/components/ui';
import { vehicleAPI, branchAPI, jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

const serviceTypes = [
    { key: 'diagnosis_only', label: 'Diagnosis Only', icon: '🔍', price: 'AED 100' },
    { key: 'minor', label: 'Minor Service', icon: '🔧', price: 'From AED 250' },
    { key: 'regular', label: 'Regular Service', icon: '⚙️', price: 'From AED 500' },
    { key: 'major', label: 'Major Service', icon: '🛠️', price: 'From AED 1,500' },
    { key: 'ac_service', label: 'AC Service', icon: '❄️', price: 'From AED 200' },
    { key: 'electrical', label: 'Electrical', icon: '🔌', price: 'Quote' },
    { key: 'battery', label: 'Battery', icon: '🔋', price: 'From AED 150' },
    { key: 'tyre', label: 'Tyre Service', icon: '🛞', price: 'From AED 100' },
];

export default function BookScreen() {
    const params = useLocalSearchParams<{ type?: string }>();
    const queryClient = useQueryClient();

    const [step, setStep] = useState(1);
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<string>(params.type || '');
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
    const [intakeType, setIntakeType] = useState<'drop_off' | 'pickup'>('drop_off');
    const [pickupAddress, setPickupAddress] = useState('');
    const [notes, setNotes] = useState('');

    const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
        queryKey: ['vehicles'],
        queryFn: () => vehicleAPI.list(),
    });

    const { data: branchesData, isLoading: branchesLoading } = useQuery({
        queryKey: ['branches'],
        queryFn: () => branchAPI.list(),
    });

    const bookMutation = useMutation({
        mutationFn: (data: any) => jobAPI.create(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            Alert.alert('Success', 'Your service has been booked!', [
                { text: 'View Job', onPress: () => router.replace(`/job/${response.data.id}`) },
            ]);
        },
        onError: (err: any) => {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to book service');
        },
    });

    const vehicles = vehiclesData?.data?.vehicles || [];
    const branches = branchesData?.data?.branches || [];

    const handleBook = () => {
        if (!selectedVehicle || !selectedService || !selectedBranch) {
            Alert.alert('Error', 'Please complete all required fields');
            return;
        }

        bookMutation.mutate({
            vehicle_id: selectedVehicle,
            branch_id: selectedBranch,
            service_type: selectedService,
            intake_type: intakeType,
            pickup_address: intakeType === 'pickup' ? pickupAddress : undefined,
            customer_notes: notes || undefined,
        });
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <View>
                        <Text style={styles.stepTitle}>Select Vehicle</Text>
                        <Text style={styles.stepSubtitle}>Choose the vehicle for service</Text>

                        {vehiclesLoading ? (
                            <Loading message="Loading vehicles..." />
                        ) : vehicles.length === 0 ? (
                            <Card style={styles.emptyCard}>
                                <Text style={styles.emptyText}>No vehicles added</Text>
                                <Button
                                    title="Add Vehicle"
                                    variant="outline"
                                    size="sm"
                                    onPress={() => router.push('/vehicles/add')}
                                />
                            </Card>
                        ) : (
                            vehicles.map((vehicle: any) => (
                                <TouchableOpacity
                                    key={vehicle.id}
                                    style={[
                                        styles.optionCard,
                                        selectedVehicle === vehicle.id && styles.optionCardSelected,
                                    ]}
                                    onPress={() => setSelectedVehicle(vehicle.id)}
                                >
                                    <View style={styles.optionIcon}>
                                        <Ionicons name="car" size={24} color={colors.primary[400]} />
                                    </View>
                                    <View style={styles.optionInfo}>
                                        <Text style={styles.optionTitle}>{vehicle.plate_number}</Text>
                                        <Text style={styles.optionSubtitle}>
                                            {vehicle.make} {vehicle.model} ({vehicle.year})
                                        </Text>
                                    </View>
                                    {selectedVehicle === vehicle.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                );

            case 2:
                return (
                    <View>
                        <Text style={styles.stepTitle}>Select Service</Text>
                        <Text style={styles.stepSubtitle}>What do you need?</Text>

                        <View style={styles.servicesGrid}>
                            {serviceTypes.map((service) => (
                                <TouchableOpacity
                                    key={service.key}
                                    style={[
                                        styles.serviceCard,
                                        selectedService === service.key && styles.serviceCardSelected,
                                    ]}
                                    onPress={() => setSelectedService(service.key)}
                                >
                                    <Text style={styles.serviceIcon}>{service.icon}</Text>
                                    <Text style={styles.serviceLabel}>{service.label}</Text>
                                    <Text style={styles.servicePrice}>{service.price}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View>
                        <Text style={styles.stepTitle}>Select Location</Text>
                        <Text style={styles.stepSubtitle}>Choose service center</Text>

                        {branchesLoading ? (
                            <Loading message="Loading branches..." />
                        ) : (
                            branches.map((branch: any) => (
                                <TouchableOpacity
                                    key={branch.id}
                                    style={[
                                        styles.optionCard,
                                        selectedBranch === branch.id && styles.optionCardSelected,
                                    ]}
                                    onPress={() => setSelectedBranch(branch.id)}
                                >
                                    <View style={styles.optionIcon}>
                                        <Ionicons name="location" size={24} color={colors.accent[400]} />
                                    </View>
                                    <View style={styles.optionInfo}>
                                        <Text style={styles.optionTitle}>{branch.name}</Text>
                                        <Text style={styles.optionSubtitle}>{branch.address}</Text>
                                    </View>
                                    {selectedBranch === branch.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={colors.primary[500]} />
                                    )}
                                </TouchableOpacity>
                            ))
                        )}

                        <Text style={[styles.stepTitle, { marginTop: spacing.xl }]}>Pickup Option</Text>

                        <View style={styles.pickupOptions}>
                            <TouchableOpacity
                                style={[styles.pickupOption, intakeType === 'drop_off' && styles.pickupOptionSelected]}
                                onPress={() => setIntakeType('drop_off')}
                            >
                                <Ionicons name="car" size={32} color={intakeType === 'drop_off' ? colors.primary[400] : colors.neutral[500]} />
                                <Text style={[styles.pickupText, intakeType === 'drop_off' && styles.pickupTextSelected]}>
                                    Drop Off
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.pickupOption, intakeType === 'pickup' && styles.pickupOptionSelected]}
                                onPress={() => setIntakeType('pickup')}
                            >
                                <Ionicons name="navigate" size={32} color={intakeType === 'pickup' ? colors.primary[400] : colors.neutral[500]} />
                                <Text style={[styles.pickupText, intakeType === 'pickup' && styles.pickupTextSelected]}>
                                    Pickup
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {intakeType === 'pickup' && (
                            <Input
                                label="Pickup Address"
                                placeholder="Enter your pickup address"
                                value={pickupAddress}
                                onChangeText={setPickupAddress}
                                leftIcon="location-outline"
                                containerStyle={{ marginTop: spacing.md }}
                            />
                        )}
                    </View>
                );

            case 4:
                return (
                    <View>
                        <Text style={styles.stepTitle}>Additional Notes</Text>
                        <Text style={styles.stepSubtitle}>Describe your issue (optional)</Text>

                        <Input
                            placeholder="E.g., AC not cooling, strange noise when braking..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                            style={{ height: 120, textAlignVertical: 'top' }}
                        />

                        <Card style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Booking Summary</Text>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Vehicle</Text>
                                <Text style={styles.summaryValue}>
                                    {vehicles.find((v: any) => v.id === selectedVehicle)?.plate_number}
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Service</Text>
                                <Text style={styles.summaryValue}>
                                    {serviceTypes.find((s) => s.key === selectedService)?.label}
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Location</Text>
                                <Text style={styles.summaryValue}>
                                    {branches.find((b: any) => b.id === selectedBranch)?.name}
                                </Text>
                            </View>

                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Option</Text>
                                <Text style={styles.summaryValue}>
                                    {intakeType === 'pickup' ? 'Pickup Service' : 'Drop Off'}
                                </Text>
                            </View>
                        </Card>
                    </View>
                );
        }
    };

    const canProceed = () => {
        switch (step) {
            case 1: return selectedVehicle !== null;
            case 2: return selectedService !== '';
            case 3: return selectedBranch !== null && (intakeType !== 'pickup' || pickupAddress.length > 0);
            case 4: return true;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Book Service</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Progress */}
            <View style={styles.progress}>
                {[1, 2, 3, 4].map((s) => (
                    <View
                        key={s}
                        style={[
                            styles.progressDot,
                            s <= step && styles.progressDotActive,
                        ]}
                    />
                ))}
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {renderStep()}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.footer}>
                {step < 4 ? (
                    <Button
                        title="Continue"
                        onPress={() => setStep(step + 1)}
                        disabled={!canProceed()}
                        fullWidth
                    />
                ) : (
                    <Button
                        title="Confirm Booking"
                        onPress={handleBook}
                        loading={bookMutation.isPending}
                        fullWidth
                    />
                )}
            </View>
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
    progress: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    progressDot: {
        width: 50,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.neutral[700],
    },
    progressDotActive: {
        backgroundColor: colors.primary[500],
    },
    content: {
        flex: 1,
        paddingHorizontal: spacing.lg,
    },
    stepTitle: {
        fontSize: typography.size.xl,
        color: colors.text.primary,
        fontWeight: 'bold',
        marginBottom: spacing.xs,
    },
    stepSubtitle: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginBottom: spacing.lg,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    optionCardSelected: {
        borderColor: colors.primary[500],
        backgroundColor: colors.background.elevated,
    },
    optionIcon: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    optionTitle: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    optionSubtitle: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.md,
    },
    emptyText: {
        fontSize: typography.size.md,
        color: colors.text.tertiary,
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    serviceCard: {
        width: '47%',
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    serviceCardSelected: {
        borderColor: colors.primary[500],
        backgroundColor: colors.background.elevated,
    },
    serviceIcon: {
        fontSize: 32,
        marginBottom: spacing.sm,
    },
    serviceLabel: {
        fontSize: typography.size.sm,
        color: colors.text.primary,
        fontWeight: '500',
        textAlign: 'center',
    },
    servicePrice: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: 4,
    },
    pickupOptions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    pickupOption: {
        flex: 1,
        alignItems: 'center',
        padding: spacing.lg,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    pickupOptionSelected: {
        borderColor: colors.primary[500],
        backgroundColor: colors.background.elevated,
    },
    pickupText: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
        marginTop: spacing.sm,
        fontWeight: '500',
    },
    pickupTextSelected: {
        color: colors.text.primary,
    },
    summaryCard: {
        marginTop: spacing.lg,
        backgroundColor: colors.background.elevated,
    },
    summaryTitle: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
        marginBottom: spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[700],
    },
    summaryLabel: {
        fontSize: typography.size.md,
        color: colors.text.secondary,
    },
    summaryValue: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '500',
    },
    footer: {
        padding: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[800],
        backgroundColor: colors.background.secondary,
    },
});
