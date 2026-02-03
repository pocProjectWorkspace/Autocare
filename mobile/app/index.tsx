/**
 * Welcome/Splash Screen
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAuthStore } from '@/stores';
import { Button } from '@/components/ui';
import { colors, typography, spacing } from '@/constants/theme';

export default function WelcomeScreen() {
    const { isAuthenticated, isLoading, user } = useAuthStore();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            // Navigate based on role
            if (user.role === 'customer') {
                router.replace('/(tabs)/home');
            } else {
                router.replace('/(tabs)/dashboard');
            }
        }
    }, [isLoading, isAuthenticated, user]);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <Text style={styles.logo}>🚗 AutoCare</Text>
            </View>
        );
    }

    return (
        <LinearGradient
            colors={[colors.background.primary, colors.background.secondary]}
            style={styles.container}
        >
            <Animated.View entering={FadeIn.duration(800)} style={styles.logoContainer}>
                <Text style={styles.logoIcon}>🚗</Text>
                <Text style={styles.logoText}>AutoCare</Text>
                <Text style={styles.tagline}>Premium Automobile Service</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.features}>
                <View style={styles.feature}>
                    <Text style={styles.featureIcon}>📱</Text>
                    <Text style={styles.featureText}>Book Service Anytime</Text>
                </View>
                <View style={styles.feature}>
                    <Text style={styles.featureIcon}>🔧</Text>
                    <Text style={styles.featureText}>Expert Technicians</Text>
                </View>
                <View style={styles.feature}>
                    <Text style={styles.featureIcon}>📍</Text>
                    <Text style={styles.featureText}>Pickup & Delivery</Text>
                </View>
                <View style={styles.feature}>
                    <Text style={styles.featureIcon}>💬</Text>
                    <Text style={styles.featureText}>Real-time Updates</Text>
                </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.buttons}>
                <Button
                    title="Get Started"
                    onPress={() => router.push('/(auth)/login')}
                    fullWidth
                />
                <Text style={styles.terms}>
                    By continuing, you agree to our Terms of Service
                </Text>
            </Animated.View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: spacing.lg,
        justifyContent: 'space-between',
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
    },
    logo: {
        fontSize: 32,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    logoContainer: {
        alignItems: 'center',
        marginTop: 80,
    },
    logoIcon: {
        fontSize: 64,
        marginBottom: spacing.md,
    },
    logoText: {
        fontSize: typography.size.display,
        fontWeight: 'bold',
        color: colors.text.primary,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: typography.size.lg,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    features: {
        gap: spacing.lg,
    },
    feature: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.tertiary,
        padding: spacing.md,
        borderRadius: 16,
        gap: spacing.md,
    },
    featureIcon: {
        fontSize: 28,
    },
    featureText: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: '500',
    },
    buttons: {
        marginBottom: spacing.xl,
    },
    terms: {
        fontSize: typography.size.sm,
        color: colors.text.tertiary,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});
