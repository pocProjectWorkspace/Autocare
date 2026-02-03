/**
 * Tab Layout - Main Navigation
 */
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores';
import { colors } from '@/constants/theme';

export default function TabLayout() {
    const user = useAuthStore((state) => state.user);
    const isCustomer = user?.role === 'customer';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.background.secondary,
                    borderTopColor: colors.neutral[800],
                    borderTopWidth: 1,
                    height: 65,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: colors.primary[500],
                tabBarInactiveTintColor: colors.neutral[500],
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            {isCustomer ? (
                <>
                    <Tabs.Screen
                        name="home"
                        options={{
                            title: 'Home',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="home" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="jobs"
                        options={{
                            title: 'My Jobs',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="clipboard" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="book"
                        options={{
                            title: 'Book',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="add-circle" size={size + 8} color={colors.primary[500]} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="notifications"
                        options={{
                            title: 'Updates',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="notifications" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: 'Profile',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="person" size={size} color={color} />
                            ),
                        }}
                    />
                </>
            ) : (
                <>
                    <Tabs.Screen
                        name="dashboard"
                        options={{
                            title: 'Dashboard',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="grid" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="jobs"
                        options={{
                            title: 'Jobs',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="clipboard" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="notifications"
                        options={{
                            title: 'Alerts',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="notifications" size={size} color={color} />
                            ),
                        }}
                    />
                    <Tabs.Screen
                        name="profile"
                        options={{
                            title: 'Profile',
                            tabBarIcon: ({ color, size }) => (
                                <Ionicons name="person" size={size} color={color} />
                            ),
                        }}
                    />
                </>
            )}

            {/* Hidden screens */}
            <Tabs.Screen name="home" options={{ href: isCustomer ? undefined : null }} />
            <Tabs.Screen name="book" options={{ href: isCustomer ? undefined : null }} />
            <Tabs.Screen name="dashboard" options={{ href: !isCustomer ? undefined : null }} />
        </Tabs>
    );
}
