/**
 * Modernist theme — flat · architectural · Archivo · red on light.
 * Same export shape as before so consuming screens keep working.
 */

export const colors = {
    // Accent (Modernist red) — mapped onto the legacy `primary` role.
    // Ramp shifted so step 400 = brand red (many screens use primary[400] for
    // icon/text tint on a light ground — needs to stay legible).
    primary: {
        50:  '#fff2ef',  // very light tint
        100: '#ffe0d9',  // light tint (badge bg)
        200: '#ffc4b8',  // mid tint
        300: '#ff563c',  // light red (hover on dark surfaces)
        400: '#ec3013',  // ← brand accent (icons/text on light ground)
        500: '#dd2b0f',  // deeper — buttons, pressed
        600: '#ae1800',
        700: '#7c1405',
        800: '#4d170e',
        900: '#2d0a00',
    },

    // Legacy `accent` role — reuse the same ramp (Modernist is a mono system)
    accent: {
        50: '#fff2ef',
        100: '#ffe0da',
        200: '#ffc4b9',
        300: '#ff9784',
        400: '#ef6853',
        500: '#ec3013', // Main
        600: '#c94b39',
        700: '#9e3526',
        800: '#71261b',
        900: '#471d16',
    },

    success: {
        main:  '#1e6b3a',
        light: '#d9ecdd',
        dark:  '#0f5227',
    },

    warning: {
        main:  '#b8860b',
        light: '#fff5d6',
        dark:  '#8a6408',
    },

    error: {
        main:  '#dd2b0f',
        light: '#fff2ef',
        dark:  '#ae1800',
    },

    info: '#1c4c8c',

    // Neutrals — Modernist ramp (light ground)
    neutral: {
        50:  '#f8f4f4',
        100: '#f8f4f4',
        200: '#eae7e7',
        300: '#d7d3d3',
        400: '#bab6b6',
        500: '#9b9797',
        600: '#7d7979',
        700: '#605d5d',
        800: '#444141',
        900: '#2d2b2b',
        950: '#201e1d',
    },

    // Surfaces — flipped to light ground
    background: {
        primary:  '#f3f2f2', // page ground
        secondary:'#eae9e9', // muted surface
        tertiary: '#ffffff', // card/panel surface
        elevated: '#ffffff', // modal/popup
    },

    // Text on light ground
    text: {
        primary:  '#201e1d',
        secondary:'#605d5d',
        tertiary: '#7d7979',
        disabled: '#bab6b6',
    },

    // Job card status colors — mono-forward, Modernist accent for the "active/waiting" states
    status: {
        requested:         '#b8860b',
        scheduled:         '#605d5d',
        inProgress:        '#1c4c8c',
        awaitingApproval:  '#ec3013',
        approved:          '#1e6b3a',
        paid:              '#1e6b3a',
        completed:         '#1e6b3a',
        delivered:         '#1e6b3a',
        cancelled:         '#dd2b0f',
    },
};

export const spacing = {
    xs:  4,
    sm:  8,
    md:  16,
    lg:  24,
    xl:  32,
    xxl: 48,
};

// Zero-radius on purpose (Modernist)
export const borderRadius = {
    sm:   0,
    md:   0,
    lg:   0,
    xl:   0,
    full: 999, // reserved for dots/avatars only
};

// Divider width used by the design system (2px major, 1px hairline)
export const divider = {
    major:    2,
    hairline: 1,
    colorMajor:    'rgba(32, 30, 29, 0.4)',
    colorHairline: 'rgba(32, 30, 29, 0.15)',
};

export const typography = {
    fontFamily: {
        regular:  'Archivo_400Regular',
        medium:   'Archivo_500Medium',
        semibold: 'Archivo_600SemiBold',
        bold:     'Archivo_800ExtraBold',
    },

    size: {
        xs:      11,
        sm:      13,
        md:      14,
        lg:      16,
        xl:      18,
        xxl:     22,
        xxxl:    28,
        display: 40,
    },

    lineHeight: {
        tight:   1.15,
        normal:  1.5,
        relaxed: 1.7,
    },
};

// Elevation — soft ink, kept low-key. `glow` retained (no-op) for compatibility.
export const shadows = {
    sm: {
        shadowColor: '#201e1d',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 2,
        elevation: 1,
    },
    md: {
        shadowColor: '#201e1d',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    lg: {
        shadowColor: '#201e1d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
    },
    glow: {
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
};

export default {
    colors,
    spacing,
    borderRadius,
    divider,
    typography,
    shadows,
};
