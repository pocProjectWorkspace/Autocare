/**
 * OTP Verification Screen
 */
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui';
import { authAPI } from '@/services';
import { useAuthStore } from '@/stores';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

export default function VerifyScreen() {
    const params = useLocalSearchParams<{ mobile: string; name?: string; email?: string; purpose: string }>();
    const { login } = useAuthStore();

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleOtpChange = (value: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto submit when complete
        if (newOtp.every(d => d) && newOtp.join('').length === 6) {
            handleVerify(newOtp.join(''));
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        if (code.length !== 6) {
            Alert.alert('Error', 'Please enter complete OTP');
            return;
        }

        setLoading(true);

        try {
            if (params.purpose === 'register') {
                const response = await authAPI.register({
                    full_name: params.name!,
                    mobile: params.mobile,
                    email: params.email,
                    otp: code,
                });
                await login(
                    response.data.access_token,
                    response.data.refresh_token,
                    response.data.user
                );
            } else {
                const response = await authAPI.verifyOTP(params.mobile, code);
                await login(
                    response.data.access_token,
                    response.data.refresh_token,
                    response.data.user
                );
            }

            router.replace('/(tabs)/home');
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Verification failed';
            Alert.alert('Error', message);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        try {
            await authAPI.requestOTP(params.mobile, params.purpose);
            setCountdown(60);
            Alert.alert('OTP Resent', 'A new OTP has been sent to your mobile');
        } catch (err: any) {
            Alert.alert('Error', 'Failed to resend OTP');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>

            <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
                <Text style={styles.title}>Verify OTP</Text>
                <Text style={styles.subtitle}>
                    Enter the 6-digit code sent to{'\n'}
                    <Text style={styles.mobile}>{params.mobile}</Text>
                </Text>

                <View style={styles.otpContainer}>
                    {otp.map((digit, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            style={[styles.otpInput, digit && styles.otpInputFilled]}
                            value={digit}
                            onChangeText={(value) => handleOtpChange(value, index)}
                            onKeyPress={(e) => handleKeyPress(e, index)}
                            keyboardType="number-pad"
                            maxLength={1}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <Button
                    title="Verify"
                    onPress={() => handleVerify()}
                    loading={loading}
                    fullWidth
                />

                <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                        <Text style={styles.countdown}>Resend OTP in {countdown}s</Text>
                    ) : (
                        <TouchableOpacity onPress={handleResend}>
                            <Text style={styles.resendLink}>Resend OTP</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    backButton: {
        padding: spacing.md,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    title: {
        fontSize: typography.size.xxxl,
        fontWeight: 'bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: typography.size.lg,
        color: colors.text.secondary,
        marginBottom: spacing.xl,
        lineHeight: 26,
    },
    mobile: {
        color: colors.primary[400],
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    otpInput: {
        width: 50,
        height: 60,
        backgroundColor: colors.background.tertiary,
        borderRadius: borderRadius.md,
        borderWidth: 2,
        borderColor: 'transparent',
        fontSize: typography.size.xxl,
        fontWeight: 'bold',
        color: colors.text.primary,
        textAlign: 'center',
    },
    otpInputFilled: {
        borderColor: colors.primary[500],
        backgroundColor: colors.background.elevated,
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: spacing.xl,
    },
    countdown: {
        color: colors.text.tertiary,
        fontSize: typography.size.md,
    },
    resendLink: {
        color: colors.primary[400],
        fontSize: typography.size.md,
        fontWeight: '600',
    },
});
