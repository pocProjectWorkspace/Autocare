/**
 * Vendor Tab Layout
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export default function VendorLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background.secondary,
                    borderTopColor: colors.neutral[800],
                    height: 85,
                    paddingBottom: 20,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: colors.primary[400],
                tabBarInactiveTintColor: colors.neutral[500],
            }}
        >
            <Tabs.Screen
                name="rfq"
                options={{
                    title: 'RFQs',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="document-text-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="quotes"
                options={{
                    title: 'My Quotes',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="pricetag-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cube-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
