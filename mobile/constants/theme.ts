/**
 * App Theme - Premium Dark Design System
 */

export const colors = {
    // Primary palette - Deep blue/purple gradient
    primary: {
        50: '#E8EAFF',
        100: '#C4C9FF',
        200: '#9DA5FF',
        300: '#7680FF',
        400: '#5B66FF',
        500: '#4F5BFF', // Main
        600: '#4751E5',
        700: '#3D45CC',
        800: '#3339B2',
        900: '#262B8F',
    },

    // Accent - Cyan/Teal
    accent: {
        50: '#E0FCFF',
        100: '#BEF8FD',
        200: '#87EEF8',
        300: '#54E1F0',
        400: '#2DD4E4',
        500: '#0EC7D9', // Main
        600: '#0AADBD',
        700: '#0892A0',
        800: '#077684',
        900: '#055568',
    },

    // Success
    success: {
        main: '#10B981',
        light: '#34D399',
        dark: '#059669',
    },

    // Warning
    warning: {
        main: '#F59E0B',
        light: '#FBBF24',
        dark: '#D97706',
    },

    // Error
    error: {
        main: '#EF4444',
        light: '#F87171',
        dark: '#DC2626',
    },

    // Info
    info: '#3B82F6',

    // Neutral - For dark theme
    neutral: {
        50: '#FAFAFA',
        100: '#F4F4F5',
        200: '#E4E4E7',
        300: '#D4D4D8',
        400: '#A1A1AA',
        500: '#71717A',
        600: '#52525B',
        700: '#3F3F46',
        800: '#27272A',
        900: '#18181B',
        950: '#0F0F12',
    },

    // Background colors
    background: {
        primary: '#0A0E27',    // Deep navy
        secondary: '#121832',  // Slightly lighter
        tertiary: '#1A2142',   // Card background
        elevated: '#222B52',   // Modal/popup
    },

    // Text colors
    text: {
        primary: '#FFFFFF',
        secondary: '#A8B2D1',
        tertiary: '#6B7394',
        disabled: '#4A5074',
    },

    // Status colors for job cards
    status: {
        requested: '#F59E0B',
        scheduled: '#8B5CF6',
        inProgress: '#3B82F6',
        awaitingApproval: '#EC4899',
        approved: '#10B981',
        paid: '#14B8A6',
        completed: '#22C55E',
        delivered: '#06B6D4',
        cancelled: '#EF4444',
    },
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const typography = {
    // Font families
    fontFamily: {
        regular: 'System',
        medium: 'System',
        semibold: 'System',
        bold: 'System',
    },

    // Font sizes
    size: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
        display: 40,
    },

    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    glow: {
        shadowColor: '#4F5BFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
};

export default {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};
