/**
 * Driver Route Map Screen
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Card, Loading } from '@/components/ui';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

interface Stop {
    id: string;
    type: 'pickup' | 'delivery';
    jobNumber: string;
    customerName: string;
    address: string;
    phone: string;
    vehiclePlate: string;
    scheduledTime?: string;
    status: string;
}

export default function MapScreen() {
    const [stops, setStops] = useState<Stop[]>([]);

    const { data: pickupsData, isLoading: loadingPickups } = useQuery({
        queryKey: ['driver-pickups-map'],
        queryFn: () => jobAPI.list({ status_filter: 'scheduled' }),
    });

    const { data: deliveriesData, isLoading: loadingDeliveries } = useQuery({
        queryKey: ['driver-deliveries-map'],
        queryFn: () => jobAPI.list({ status_filter: 'ready,out_for_delivery' }),
    });

    useEffect(() => {
        const pickupJobs = (pickupsData?.data?.jobs || [])
            .filter((j: any) => j.intake_type === 'pickup')
            .map((j: any) => ({
                id: j.id,
                type: 'pickup' as const,
                jobNumber: j.job_number,
                customerName: j.customer_name,
                address: j.pickup_address || j.customer_address || 'No address',
                phone: j.customer_mobile,
                vehiclePlate: j.vehicle_plate,
                scheduledTime: j.scheduled_time,
                status: j.status,
            }));

        const deliveryJobs = (deliveriesData?.data?.jobs || []).map((j: any) => ({
            id: j.id,
            type: 'delivery' as const,
            jobNumber: j.job_number,
            customerName: j.customer_name,
            address: j.delivery_address || j.customer_address || 'No address',
            phone: j.customer_mobile,
            vehiclePlate: j.vehicle_plate,
            scheduledTime: j.delivery_time,
            status: j.status,
        }));

        // Sort by scheduled time
        const allStops = [...pickupJobs, ...deliveryJobs].sort((a, b) => {
            if (!a.scheduledTime) return 1;
            if (!b.scheduledTime) return -1;
            return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime();
        });

        setStops(allStops);
    }, [pickupsData, deliveriesData]);

    const openInMaps = (address: string) => {
        Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
    };

    const optimizeRoute = () => {
        if (stops.length < 2) return;

        // Build a Google Maps route URL with all stops
        const waypoints = stops.map(s => encodeURIComponent(s.address)).join('|');
        const origin = encodeURIComponent(stops[0].address);
        const destination = encodeURIComponent(stops[stops.length - 1].address);

        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
        Linking.openURL(url);
    };

    const isLoading = loadingPickups || loadingDeliveries;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Today's Route</Text>
                    <Text style={styles.subtitle}>{stops.length} stops</Text>
                </View>
                {stops.length >= 2 && (
                    <TouchableOpacity style={styles.optimizeBtn} onPress={optimizeRoute}>
                        <Ionicons name="navigate" size={18} color="#fff" />
                        <Text style={styles.optimizeBtnText}>Navigate All</Text>
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <Loading fullScreen message="Loading route..." />
            ) : stops.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="map-outline" size={64} color={colors.neutral[600]} />
                    <Text style={styles.emptyTitle}>No stops today</Text>
                    <Text style={styles.emptyText}>You have no pickups or deliveries scheduled</Text>
                </View>
            ) : (
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                    <View style={styles.timeline}>
                        {stops.map((stop, index) => (
                            <View key={stop.id} style={styles.timelineItem}>
                                {/* Timeline connector */}
                                <View style={styles.timelineConnector}>
                                    <View style={[
                                        styles.timelineDot,
                                        stop.type === 'pickup' ? styles.pickupDot : styles.deliveryDot
                                    ]}>
                                        <Ionicons
                                            name={stop.type === 'pickup' ? 'arrow-up' : 'arrow-down'}
                                            size={14}
                                            color="#fff"
                                        />
                                    </View>
                                    {index < stops.length - 1 && <View style={styles.timelineLine} />}
                                </View>

                                {/* Stop Card */}
                                <Card style={styles.stopCard}>
                                    <View style={styles.stopHeader}>
                                        <View style={[
                                            styles.typeBadge,
                                            stop.type === 'pickup' ? styles.pickupBadge : styles.deliveryBadge
                                        ]}>
                                            <Text style={styles.typeText}>
                                                {stop.type === 'pickup' ? 'PICKUP' : 'DELIVERY'}
                                            </Text>
                                        </View>
                                        <Text style={styles.jobNumber}>{stop.jobNumber}</Text>
                                    </View>

                                    <Text style={styles.customerName}>{stop.customerName}</Text>
                                    <Text style={styles.vehiclePlate}>{stop.vehiclePlate}</Text>

                                    <View style={styles.addressContainer}>
                                        <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                                        <Text style={styles.address} numberOfLines={2}>{stop.address}</Text>
                                    </View>

                                    {stop.scheduledTime && (
                                        <View style={styles.timeContainer}>
                                            <Ionicons name="time-outline" size={16} color={colors.warning.main} />
                                            <Text style={styles.time}>
                                                {new Date(stop.scheduledTime).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.stopActions}>
                                        <TouchableOpacity
                                            style={styles.actionBtn}
                                            onPress={() => Linking.openURL(`tel:${stop.phone}`)}
                                        >
                                            <Ionicons name="call" size={18} color={colors.success.main} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionBtn, styles.navigateBtn]}
                                            onPress={() => openInMaps(stop.address)}
                                        >
                                            <Ionicons name="navigate" size={18} color="#fff" />
                                            <Text style={styles.navigateBtnText}>Navigate</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            </View>
                        ))}
                    </View>

                    <View style={{ height: spacing.xxl * 2 }} />
                </ScrollView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
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
    optimizeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primary[500],
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    optimizeBtnText: {
        color: '#fff',
        fontSize: typography.size.sm,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    timeline: {
        paddingHorizontal: spacing.lg,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    timelineConnector: {
        width: 40,
        alignItems: 'center',
    },
    timelineDot: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    pickupDot: {
        backgroundColor: colors.accent[500],
    },
    deliveryDot: {
        backgroundColor: colors.primary[500],
    },
    timelineLine: {
        position: 'absolute',
        top: 28,
        bottom: -spacing.md,
        width: 2,
        backgroundColor: colors.neutral[700],
    },
    stopCard: {
        flex: 1,
        marginLeft: spacing.sm,
    },
    stopHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.xs,
    },
    typeBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    pickupBadge: {
        backgroundColor: colors.accent[500] + '20',
    },
    deliveryBadge: {
        backgroundColor: colors.primary[500] + '20',
    },
    typeText: {
        fontSize: typography.size.xs,
        fontWeight: '700',
        color: colors.accent[400],
    },
    jobNumber: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
    },
    customerName: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: '600',
    },
    vehiclePlate: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.xs,
        marginTop: spacing.sm,
    },
    address: {
        flex: 1,
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        lineHeight: 18,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginTop: spacing.xs,
    },
    time: {
        fontSize: typography.size.sm,
        color: colors.warning.main,
        fontWeight: '500',
    },
    stopActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.neutral[700],
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.background.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    navigateBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: spacing.xs,
        backgroundColor: colors.primary[500],
    },
    navigateBtnText: {
        color: '#fff',
        fontSize: typography.size.sm,
        fontWeight: '600',
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
