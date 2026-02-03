/**
 * Status Badge Component
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '@/constants/theme';
import { JOB_STATUS_LABELS } from '@/constants/config';

interface StatusBadgeProps {
    status: string;
    size?: 'sm' | 'md';
}

const statusColors: Record<string, { bg: string; text: string }> = {
    requested: { bg: '#F59E0B20', text: '#F59E0B' },
    scheduled: { bg: '#8B5CF620', text: '#8B5CF6' },
    vehicle_picked: { bg: '#6366F120', text: '#6366F1' },
    in_intake: { bg: '#3B82F620', text: '#3B82F6' },
    diagnosed: { bg: '#06B6D420', text: '#06B6D4' },
    awaiting_estimate_approval: { bg: '#EC489920', text: '#EC4899' },
    estimate_approved: { bg: '#10B98120', text: '#10B981' },
    rfq_sent: { bg: '#8B5CF620', text: '#8B5CF6' },
    quotes_received: { bg: '#6366F120', text: '#6366F1' },
    awaiting_parts_approval: { bg: '#EC489920', text: '#EC4899' },
    parts_approved: { bg: '#10B98120', text: '#10B981' },
    awaiting_payment: { bg: '#F59E0B20', text: '#F59E0B' },
    partially_paid: { bg: '#14B8A620', text: '#14B8A6' },
    paid: { bg: '#10B98120', text: '#10B981' },
    parts_ordered: { bg: '#6366F120', text: '#6366F1' },
    parts_received: { bg: '#06B6D420', text: '#06B6D4' },
    in_service: { bg: '#3B82F620', text: '#3B82F6' },
    testing: { bg: '#8B5CF620', text: '#8B5CF6' },
    ready: { bg: '#22C55E20', text: '#22C55E' },
    out_for_delivery: { bg: '#06B6D420', text: '#06B6D4' },
    delivered: { bg: '#14B8A620', text: '#14B8A6' },
    closed: { bg: '#22C55E20', text: '#22C55E' },
    cancelled: { bg: '#EF444420', text: '#EF4444' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
    const colorConfig = statusColors[status] || { bg: colors.neutral[700], text: colors.neutral[300] };
    const label = JOB_STATUS_LABELS[status] || status;

    return (
        <View
            style={[
                styles.badge,
                size === 'sm' && styles.badgeSm,
                { backgroundColor: colorConfig.bg },
            ]}
        >
            <View style={[styles.dot, { backgroundColor: colorConfig.text }]} />
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
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    badgeSm: {
        paddingHorizontal: spacing.xs + 2,
        paddingVertical: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: spacing.xs,
    },
    text: {
        fontSize: typography.size.sm,
        fontWeight: '600',
    },
    textSm: {
        fontSize: typography.size.xs,
    },
});
