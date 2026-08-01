/**
 * Modernist Card — flat white surface with a hairline border.
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, borderRadius, spacing, divider } from '@/constants/theme';

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
}) => {
    const cardStyles = [
        styles.card,
        variant === 'outlined' && styles.outlined,
        style,
    ];

    const cardContent = <View style={cardStyles}>{children}</View>;

    if (onPress) {
        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
                {cardContent}
            </TouchableOpacity>
        );
    }

    return cardContent;
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        borderWidth: divider.hairline,
        borderColor: divider.colorMajor,
        padding: spacing.md,
    },
    outlined: {
        backgroundColor: 'transparent',
        borderColor: divider.colorMajor,
    },
});
