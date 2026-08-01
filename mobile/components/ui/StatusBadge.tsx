/**
 * Modernist Status Badge — sharp rectangle, tinted fill, colored dot.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '@/constants/theme';
import { JOB_STATUS_LABELS } from '@/constants/config';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

// Grouped by the semantic clusters from the design brief.
// Each status maps to a { bg, text, dot } trio drawn from the Modernist palette.
const CLUSTERS = {
    warning:  { bg: '#fff5d6', text: '#8a6408', dot: '#b8860b' },  // scheduled / requested / awaiting_payment
    info:     { bg: '#dbe6f5', text: '#1c4c8c', dot: '#1c4c8c' },  // in-progress
    accent:   { bg: '#fff2ef', text: '#ae1800', dot: '#ec3013' },  // awaiting approvals
    success:  { bg: '#d9ecdd', text: '#0f5227', dot: '#1e6b3a' },  // approved / paid / done
    danger:   { bg: '#fff2ef', text: '#ae1800', dot: '#dd2b0f' },  // cancelled
    neutral:  { bg: '#eae7e7', text: '#444141', dot: '#605d5d' },  // default
};

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    requested: CLUSTERS.warning,
    scheduled: CLUSTERS.warning,
    vehicle_picked: CLUSTERS.info,
    en_route_pickup: CLUSTERS.info,
    in_intake: CLUSTERS.info,
    diagnosed: CLUSTERS.info,
    awaiting_estimate_approval: CLUSTERS.accent,
    estimate_approved: CLUSTERS.success,
    rfq_sent: CLUSTERS.info,
    quotes_received: CLUSTERS.info,
    awaiting_parts_approval: CLUSTERS.accent,
    parts_approved: CLUSTERS.success,
    awaiting_payment: CLUSTERS.accent,
    partially_paid: CLUSTERS.warning,
    paid: CLUSTERS.success,
    parts_ordered: CLUSTERS.info,
    parts_received: CLUSTERS.info,
    in_service: CLUSTERS.info,
    testing: CLUSTERS.info,
    ready: CLUSTERS.success,
    out_for_delivery: CLUSTERS.info,
    delivered: CLUSTERS.success,
    closed: CLUSTERS.success,
    cancelled: CLUSTERS.danger,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
    const colorConfig = statusColors[status] || CLUSTERS.neutral;
    const label = JOB_STATUS_LABELS[status] || status;

    return (
        <View
            style={[
                styles.badge,
                size === 'sm' && styles.badgeSm,
                { backgroundColor: colorConfig.bg },
            ]}
        >
            <View style={[styles.dot, { backgroundColor: colorConfig.dot }]} />
            <Text
                style={[
                    styles.text,
                    size === 'sm' && styles.textSm,
                    { color: colorConfig.text },
                ]}
            >
                {label}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.sm, // 0 in Modernist
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    text: {
        fontSize: typography.size.sm,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    textSm: {
        fontSize: typography.size.xs,
    },
});
