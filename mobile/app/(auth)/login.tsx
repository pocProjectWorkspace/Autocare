/**
 * Login Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { authAPI } from '@/services';
import { colors, typography, spacing } from '@/constants/theme';

export default function LoginScreen() {
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestOTP = async () => {
        if (!mobile || mobile.length < 10) {
            setError('Please enter a valid mobile number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await authAPI.requestOTP(mobile, 'login');
            // In dev mode, OTP is returned - store for demo
            const otp = response.data.otp;
            Alert.alert('OTP Sent', `Your OTP is: ${otp}\n(In production, this will be sent via SMS/WhatsApp)`);
            router.push({ pathname: '/(auth)/verify', params: { mobile, purpose: 'login' } });
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Failed to send OTP';
            if (message.includes('not found')) {
                // User doesn't exist, redirect to register
                Alert.alert(
                    'Not Registered',
                    'This number is not registered. Would you like to create an account?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Register', onPress: () => router.push({ pathname: '/(auth)/register', params: { mobile } }) },
                    ]
                );
            } else {
                setError(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>

                <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
                    <Text style={styles.title}>Welcome Back</Text>
                    <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

                    <View style={styles.form}>
                        <Input
                            label="Mobile Number"
                            placeholder="+971 50 123 4567"
                            value={mobile}
                            onChangeText={setMobile}
                            keyboardType="phone-pad"
                            leftIcon="call-outline"
                            error={error}
                            autoFocus
                        />

                        <Button
                            title="Continue"
                            onPress={handleRequestOTP}
                            loading={loading}
                            fullWidth
                        />
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Don't have an account?</Text>
                        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                            <Text style={styles.footerLink}>Register</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    keyboardView: {
        flex: 1,
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
    },
    form: {
        gap: spacing.lg,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xs,
        marginTop: spacing.xxl,
    },
    footerText: {
        color: colors.text.secondary,
        fontSize: typography.size.md,
    },
    footerLink: {
        color: colors.primary[400],
        fontSize: typography.size.md,
        fontWeight: '600',
    },
});
