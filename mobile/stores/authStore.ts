/**
 * Auth Store - Zustand state management
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants/config';

export interface User {
    id: string;
    full_name: string;
    mobile: string;
    email?: string;
    role: 'customer' | 'service_advisor' | 'technician' | 'driver' | 'vendor' | 'admin';
    is_active: boolean;
    is_verified: boolean;
    avatar_url?: string;
    branch_id?: string;
    company_name?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    login: (accessToken: string, refreshToken: string, user: User) => Promise<void>;
    logout: () => Promise<void>;
    loadUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    setUser: (user) => set({ user, isAuthenticated: !!user }),

    setLoading: (isLoading) => set({ isLoading }),

    login: async (accessToken, refreshToken, user) => {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER, JSON.stringify(user));
        set({ user, isAuthenticated: true, isLoading: false });
    },

    logout: async () => {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER);
        set({ user: null, isAuthenticated: false, isLoading: false });
    },

    loadUser: async () => {
        try {
            const userJson = await SecureStore.getItemAsync(STORAGE_KEYS.USER);
            const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

            if (userJson && token) {
                const user = JSON.parse(userJson);
                set({ user, isAuthenticated: true, isLoading: false });
            } else {
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch (error) {
            console.error('Error loading user:', error);
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
}));
