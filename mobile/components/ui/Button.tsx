/**
 * Premium Button Component
 */
import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography, shadows } from '@/constants/theme';

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
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
    ];

    const textStyles = [
        styles.text,
        styles[`text_${size}`],
        variant === 'outline' && styles.textOutline,
        variant === 'ghost' && styles.textGhost,
        isDisabled && styles.textDisabled,
        textStyle,
    ];

    const content = (
        <>
            {loading ? (
                <ActivityIndicator color={variant === 'outline' ? colors.primary[500] : '#fff'} />
            ) : (
                <>
                    {icon && <>{icon}</>}
                    <Text style={textStyles}>{title}</Text>
                </>
            )}
        </>
    );

    if (variant === 'primary' && !isDisabled) {
        return (
            <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
                <LinearGradient
                    colors={[colors.primary[500], colors.primary[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[buttonStyles, styles.gradient]}
                >
                    {content}
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isDisabled}
            activeOpacity={0.7}
            style={[
                buttonStyles,
                variant === 'secondary' && styles.secondary,
                variant === 'outline' && styles.outline,
                variant === 'ghost' && styles.ghost,
            ]}
        >
            {content}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: borderRadius.md,
        ...shadows.sm,
    },
    gradient: {
        borderRadius: borderRadius.md,
    },
    sm: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    md: {
        paddingVertical: 14,
        paddingHorizontal: 24,
    },
    lg: {
        paddingVertical: 18,
        paddingHorizontal: 32,
    },
    fullWidth: {
        width: '100%',
    },
    secondary: {
        backgroundColor: colors.accent[500],
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary[500],
    },
    ghost: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
    },
    disabled: {
        backgroundColor: colors.neutral[700],
        opacity: 0.6,
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        textAlign: 'center',
    },
    text_sm: {
        fontSize: typography.size.sm,
    },
    text_md: {
        fontSize: typography.size.md,
    },
    text_lg: {
        fontSize: typography.size.lg,
    },
    textOutline: {
        color: colors.primary[500],
    },
    textGhost: {
        color: colors.primary[400],
    },
    textDisabled: {
        color: colors.neutral[400],
    },
});
