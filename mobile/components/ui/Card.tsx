/**
 * Premium Card Component
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';

interface CardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'default' | 'gradient' | 'outlined';
    onPress?: () => void;
    gradient?: string[];
}

export const Card: React.FC<CardProps> = ({
    children,
    style,
    variant = 'default',
    onPress,
    gradient,
}) => {
    const cardContent = (
        <View style={[styles.content, style]}>
            {children}
        </View>
    );

    const renderCard = () => {
        if (variant === 'gradient') {
            return (
                <LinearGradient
                    colors={gradient || [colors.background.tertiary, colors.background.elevated]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.card, styles.gradient]}
                >
                    {cardContent}
                </LinearGradient>
            );
        }

        return (
            <View
                style={[
                    styles.card,
                    variant === 'outlined' && styles.outlined,
                ]}
            >
                {cardContent}
            </View>
        );
    };

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                {renderCard()}
            </TouchableOpacity>
        );
    }

    return renderCard();
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.lg,
        ...shadows.md,
    },
    gradient: {
        borderRadius: borderRadius.lg,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.neutral[700],
    },
    content: {
        padding: spacing.md,
    },
});
