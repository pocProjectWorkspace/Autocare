/**
 * Modernist Button — flat, sharp corners, red accent for primary.
 */
import React from 'react';
import {
    TouchableOpacity,
    Text,
    View,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import { colors, borderRadius, typography, divider } from '@/constants/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon,
    style,
    textStyle,
    fullWidth = false,
}) => {
    const isDisabled = disabled || loading;

    const buttonStyles = [
        styles.base,
        styles[size],
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${size}`],
        variant === 'primary' && styles.textPrimary,
        variant === 'secondary' && styles.textSecondary,
        variant === 'outline' && styles.textOutline,
        variant === 'ghost' && styles.textGhost,
        isDisabled && styles.textDisabled,
        textStyle,
    ];

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.8}
            style={buttonStyles}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'primary' ? '#fff' : colors.primary[500]}
                    size="small"
                />
            ) : (
                <View style={styles.inner}>
                    {icon}
                    <Text style={textStyles}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sm: { paddingVertical: 8,  paddingHorizontal: 14 },
    md: { paddingVertical: 12, paddingHorizontal: 20 },
    lg: { paddingVertical: 16, paddingHorizontal: 24 },
    fullWidth: { width: '100%' },

    primary:   { backgroundColor: colors.primary[400] },
    secondary: {
        backgroundColor: colors.background.tertiary,
        borderColor: divider.colorMajor,
    },
    outline: {
        backgroundColor: 'transparent',
        borderColor: colors.primary[400],
    },
    ghost: { backgroundColor: 'transparent' },

    disabled: { opacity: 0.45 },

    text: {
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    text_sm: { fontSize: typography.size.sm },
    text_md: { fontSize: typography.size.md },
    text_lg: { fontSize: typography.size.lg },

    textPrimary:   { color: '#fff' },
    textSecondary: { color: colors.text.primary },
    textOutline:   { color: colors.primary[400] },
    textGhost:     { color: colors.primary[400] },
    textDisabled:  { color: colors.text.disabled },
});
