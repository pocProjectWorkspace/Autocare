/**
 * Modernist Input — flush-left label, sharp field, red focus border.
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
import { colors, borderRadius, typography, spacing, divider } from '@/constants/theme';

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
                        size={18}
                        color={isFocused ? colors.primary[500] : colors.neutral[500]}
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
                            size={18}
                            color={colors.neutral[500]}
                        />
                    </TouchableOpacity>
                ) : rightIcon ? (
                    <TouchableOpacity onPress={onRightIconPress}>
                        <Ionicons name={rightIcon} size={18} color={colors.neutral[500]} />
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
        fontSize: typography.size.xs,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        borderWidth: divider.hairline,
        borderColor: divider.colorMajor,
        paddingHorizontal: spacing.sm + 2,
        minHeight: 44,
    },
    inputFocused: {
        borderColor: colors.primary[500],
    },
    inputError: {
        borderColor: colors.error.main,
    },
    input: {
        flex: 1,
        color: colors.text.primary,
        fontSize: typography.size.md,
        paddingVertical: 10,
    },
    inputWithIcon: {
        paddingLeft: 4,
    },
    leftIcon: {
        marginRight: 6,
    },
    error: {
        color: colors.error.main,
        fontSize: typography.size.xs,
        marginTop: 4,
        fontWeight: '600',
    },
});
