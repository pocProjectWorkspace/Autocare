/**
 * Job Timeline Component - Shows progress updates with images
 */
import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

interface UpdateItem {
    id: string;
    title: string;
    message: string;
    media_urls?: string[];
    created_at: string;
    created_by_name?: string;
}

interface JobTimelineProps {
    updates: UpdateItem[];
}

export default function JobTimeline({ updates }: JobTimelineProps) {
    if (!updates || updates.length === 0) {
        return (
            <View style={styles.empty}>
                <Ionicons name="footsteps-outline" size={48} color={colors.text.tertiary} />
                <Text style={styles.emptyText}>No progress updates yet</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {updates.map((update, index) => (
                <View key={update.id} style={styles.updateContainer}>
                    {/* Visual Line */}
                    <View style={styles.lineIndicator}>
                        <View style={styles.dot} />
                        {index < updates.length - 1 && <View style={styles.line} />}
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.title}>{update.title}</Text>
                            <Text style={styles.date}>
                                {new Date(update.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>

                        <Text style={styles.message}>{update.message}</Text>

                        {/* Images */}
                        {update.media_urls && update.media_urls.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
                                {update.media_urls.map((url, i) => (
                                    <TouchableOpacity key={i} activeOpacity={0.9}>
                                        <Image source={{ uri: url }} style={styles.updateImage} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        {update.created_by_name && (
                            <Text style={styles.author}>Posted by {update.created_by_name}</Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: spacing.md,
    },
    empty: {
        alignItems: 'center',
        padding: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        color: colors.text.tertiary,
        fontSize: typography.size.md,
    },
    updateContainer: {
        flexDirection: 'row',
        marginBottom: spacing.lg,
    },
    lineIndicator: {
        width: 20,
        alignItems: 'center',
        marginRight: spacing.md,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary[500],
        marginTop: 6,
        zIndex: 1,
    },
    line: {
        flex: 1,
        width: 2,
        backgroundColor: colors.neutral[700],
        marginVertical: 4,
    },
    content: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    title: {
        fontSize: typography.size.md,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    date: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
    },
    message: {
        fontSize: typography.size.sm,
        color: colors.text.secondary,
        lineHeight: 20,
    },
    imageScroll: {
        marginTop: spacing.md,
        marginHorizontal: -spacing.md,
        paddingHorizontal: spacing.md,
    },
    updateImage: {
        width: 150,
        height: 100,
        borderRadius: borderRadius.md,
        marginRight: spacing.sm,
        backgroundColor: colors.background.primary,
    },
    author: {
        fontSize: typography.size.xs,
        color: colors.text.tertiary,
        marginTop: spacing.md,
        fontStyle: 'italic',
    },
});
