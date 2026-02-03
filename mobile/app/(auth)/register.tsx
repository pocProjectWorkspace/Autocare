/**
 * Registration Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Button, Input } from '@/components/ui';
import { authAPI } from '@/services';
import { colors, typography, spacing } from '@/constants/theme';

export default function RegisterScreen() {
    const params = useLocalSearchParams<{ mobile?: string }>();

    const [name, setName] = useState('');
    const [mobile, setMobile] = useState(params.mobile || '');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = 'Name is required';
        if (!mobile || mobile.length < 10) errs.mobile = 'Valid mobile number is required';
        if (email && !email.includes('@')) errs.email = 'Invalid email address';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;

        setLoading(true);

        try {
            const response = await authAPI.requestOTP(mobile, 'register');
            const otp = response.data.otp;
            Alert.alert('OTP Sent', `Your OTP is: ${otp}\n(In production, this will be sent via SMS)`);
            router.push({
                pathname: '/(auth)/verify',
                params: { mobile, name, email, purpose: 'register' }
            });
        } catch (err: any) {
            const message = err.response?.data?.detail || 'Registration failed';
            Alert.alert('Error', message);
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
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>

                    <Animated.View entering={FadeInDown.duration(600)} style={styles.content}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join AutoCare for premium service</Text>

                        <View style={styles.form}>
                            <Input
                                label="Full Name"
                                placeholder="Enter your full name"
                                value={name}
                                onChangeText={setName}
                                leftIcon="person-outline"
                                error={errors.name}
                            />

                            <Input
                                label="Mobile Number"
                                placeholder="+971 50 123 4567"
                                value={mobile}
                                onChangeText={setMobile}
                                keyboardType="phone-pad"
                                leftIcon="call-outline"
                                error={errors.mobile}
                            />

                            <Input
                                label="Email (Optional)"
                                placeholder="your@email.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                leftIcon="mail-outline"
                                error={errors.email}
                            />

                            <Button
                                title="Continue"
                                onPress={handleRegister}
                                loading={loading}
                                fullWidth
                            />
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>Already have an account?</Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                                <Text style={styles.footerLink}>Login</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
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
        gap: spacing.md,
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
