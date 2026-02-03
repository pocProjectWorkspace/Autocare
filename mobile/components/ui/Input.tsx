/**
 * Premium Input Component
 */
import React, { useState } from 'react';
import {
    View,
    TextInput,
    Text,
    StyleSheet,
    TextInputProps,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography, spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    leftIcon?: keyof typeof Ionicons.glyphMap;
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightIconPress?: () => void;
    containerStyle?: any;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    secureTextEntry,
    ...props
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const isPassword = secureTextEntry !== undefined;

    return (
        <View style={[styles.container, containerStyle]}>
            {label && <Text style={styles.label}>{label}</Text>}

            <View
                style={[
                    styles.inputContainer,
                    isFocused && styles.inputFocused,
                    error && styles.inputError,
                ]}
            >
                {leftIcon && (
                    <Ionicons
                        name={leftIcon}
                        size={20}
                        color={isFocused ? colors.primary[400] : colors.neutral[400]}
                        style={styles.leftIcon}
                    />
                )}

                <TextInput
                    style={[styles.input, leftIcon && styles.inputWithIcon]}
                    placeholderTextColor={colors.neutral[500]}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    secureTextEntry={isPassword && !showPassword}
                    {...props}
                />

                {isPassword ? (
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={20}
                            color={colors.neutral[400]}
                        />
                    </TouchableOpacity>
                ) : rightIcon ? (
                    <TouchableOpacity onPress={onRightIconPress}>
                        <Ionicons name={rightIcon} size={20} color={colors.neutral[400]} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        color: colors.text.secondary,
        fontSize: typography.size.sm,
        fontWeight: '500',
        marginBottom: spacing.xs,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        borderColor: 'transparent',
        paddingHorizontal: spacing.md,
    },
    inputFocused: {
        borderColor: colors.primary[500],
        backgroundColor: colors.background.elevated,
    },
    inputError: {
        borderColor: colors.error.main,
    },
    input: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        paddingVertical: spacing.md,
    },
    inputWithIcon: {
        paddingLeft: spacing.xs,
    },
    leftIcon: {
        marginRight: spacing.xs,
    },
    error: {
        color: colors.error.main,
        fontSize: typography.size.xs,
        marginTop: spacing.xs,
    },
});
