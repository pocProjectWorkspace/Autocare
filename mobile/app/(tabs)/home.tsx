/**
 * Customer Home Screen
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, StatusBadge, Loading } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { jobAPI, vehicleAPI } from '@/services';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { SERVICE_TYPE_LABELS } from '@/constants/config';

export default function HomeScreen() {
    const user = useAuthStore((state) => state.user);

    const { data: jobsData, isLoading: jobsLoading, refetch } = useQuery({
        queryKey: ['jobs', 'active'],
        queryFn: () => jobAPI.list({ page_size: 5 }),
    });

    const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
        queryKey: ['vehicles'],
        queryFn: () => vehicleAPI.list(),
    });

    const activeJobs = jobsData?.data?.jobs || [];
    const vehicles = vehiclesData?.data?.vehicles || [];

    const services = [
        { icon: '🔧', label: 'Regular Service', type: 'regular' },
        { icon: '❄️', label: 'AC Service', type: 'ac_service' },
        { icon: '🔋', label: 'Battery', type: 'battery' },
        { icon: '🛞', label: 'Tyres', type: 'tyre' },
        { icon: '🔌', label: 'Electrical', type: 'electrical' },
        { icon: '🔍', label: 'Diagnosis', type: 'diagnosis_only' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hello,</Text>
                        <Text style={styles.userName}>{user?.full_name?.split(' ')[0]} 👋</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.notificationBtn}
                        onPress={() => router.push('/(tabs)/notifications')}
                    >
                        <Ionicons name="notifications-outline" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                </View>

                {/* Quick Book Banner */}
                <TouchableOpacity onPress={() => router.push('/(tabs)/book')} activeOpacity={0.9}>
                    <LinearGradient
                        colors={[colors.primary[500], colors.primary[700]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.bookBanner}
                    >
                        <View>
                            <Text style={styles.bookTitle}>Book a Service</Text>
                            <Text style={styles.bookSubtitle}>Get your car serviced today</Text>
                        </View>
                        <Ionicons name="arrow-forward-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Quick Services */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Services</Text>
                    <View style={styles.servicesGrid}>
                        {services.map((service) => (
                            <TouchableOpacity
                                key={service.type}
                                style={styles.serviceItem}
                                onPress={() => router.push({ pathname: '/(tabs)/book', params: { type: service.type } })}
                            >
                                <View style={styles.serviceIcon}>
                                    <Text style={styles.serviceEmoji}>{service.icon}</Text>
                                </View>
                                <Text style={styles.serviceLabel}>{service.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Active Jobs */}
                {activeJobs.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Active Jobs</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/jobs')}>
                                <Text style={styles.seeAll}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {activeJobs.map((job: any) => (
                            <Card key={job.id} style={styles.jobCard} onPress={() => router.push(`/job/${job.id}`)}>
                                <View style={styles.jobHeader}>
                                    <View>
                                        <Text style={styles.jobNumber}>{job.job_number}</Text>
                                        <Text style={styles.jobVehicle}>{job.vehicle_name}</Text>
                                    </View>
                                    <StatusBadge status={job.status} size="sm" />
                                </View>
                                <View style={styles.jobFooter}>
                                    <Text style={styles.jobType}>{SERVICE_TYPE_LABELS[job.service_type]}</Text>
                                    {job.grand_total > 0 && (
                                        <Text style={styles.jobAmount}>AED {job.grand_total.toFixed(2)}</Text>
                                    )}
                                </View>
                            </Card>
                        ))}
                    </View>
                )}

                {/* My Vehicles */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>My Vehicles</Text>
                        <TouchableOpacity onPress={() => router.push('/vehicles')}>
                            <Text style={styles.seeAll}>Manage</Text>
                        </TouchableOpacity>
                    </View>

                    {vehicles.length === 0 ? (
                        <Card style={styles.emptyCard}>
                            <Ionicons name="car-outline" size={48} color={colors.neutral[500]} />
                            <Text style={styles.emptyText}>No vehicles added yet</Text>
                            <TouchableOpacity onPress={() => router.push('/vehicles/add')}>
                                <Text style={styles.addLink}>+ Add Vehicle</Text>
                            </TouchableOpacity>
                        </Card>
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {vehicles.map((vehicle: any) => (
                                <Card key={vehicle.id} style={styles.vehicleCard}>
                                    <Text style={styles.vehiclePlate}>{vehicle.plate_number}</Text>
                                    <Text style={styles.vehicleName}>{vehicle.make} {vehicle.model}</Text>
                                    <Text style={styles.vehicleYear}>{vehicle.year}</Text>
                                </Card>
                            ))}
                        </ScrollView>
                    )}
                </View>

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
        paddingBottom: spacing.md,
    },
    greeting: {
        fontSize: typography.size.lg,
        color: colors.text.secondary,
    },
    userName: {
        fontSize: typography.size.xxl,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    notificationBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background.tertiary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookBanner: {
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...shadows.lg,
    },
    bookTitle: {
        fontSize: typography.size.xl,
        color: '#fff',
        fontWeight: 'bold',
    },
    bookSubtitle: {
        fontSize: typography.size.md,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    section: {
        marginTop: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: typography.size.sm,
        color: colors.primary[400],
        fontWeight: '500',
    },
    servicesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    serviceItem: {
        width: '30%',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
    },
    serviceIcon: {
        width: 48,
        height: 48,
        backgroundColor: colors.background.elevated,
        borderRadius: borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    serviceEmoji: {
        fontSize: 24,
    },
    serviceLabel: {
        fontSize: typography.size.xs,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    jobCard: {
        marginBottom: spacing.md,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    jobNumber: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    jobVehicle: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    jobType: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    jobAmount: {
        fontSize: typography.size.md,
        color: colors.accent[400],
        fontWeight: '600',
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    emptyText: {
        fontSize: typography.size.md,
        color: colors.text.tertiary,
        marginTop: spacing.md,
    },
    addLink: {
        fontSize: typography.size.md,
        color: colors.primary[400],
        fontWeight: '600',
        marginTop: spacing.sm,
    },
    vehicleCard: {
        width: 160,
        marginRight: spacing.md,
    },
    vehiclePlate: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    vehicleName: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 4,
    },
    vehicleYear: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        marginTop: 2,
    },
});
