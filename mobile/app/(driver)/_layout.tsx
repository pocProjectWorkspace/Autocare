/**
 * Driver Tab Layout
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export default function DriverLayout() {
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
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="pickups"
                options={{
                    title: 'Pickups',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="arrow-up-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="deliveries"
                options={{
                    title: 'Deliveries',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="arrow-down-circle-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: 'Route',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="navigate-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: 'History',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time-outline" size={size} color={color} />
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
