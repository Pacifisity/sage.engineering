/**
 * logic/theme.js
 * Manages theme customization, persistence, and CSS variable updates.
 */

const STORAGE_KEY = 'rift_theme';

const defaultTheme = {
    accent: '#8b5cf6',
    accentGlow: '#6d28d9',
    textOnAccent: '#ffffff',
    bgDeep: '#121214',
    bgSurface: '#1e1e22',
    bgFocus: '#1a1a1e',
    bgElevated: '#252529',
    bgElevatedHover: '#2d2d33',
    bgElevatedActive: '#2a2a2f',
    textMain: '#e2e8f0',
    textMuted: '#94a3b8',
    borderColor: '#2d2d33',
    success: '#4caf50',
    danger: '#dc2626',
    dangerDark: '#b91c1c',
    favorite: '#f43f5e',
    rating: '#fbbf24',
    ratingStrong: '#ffcc00',
    updatedAt: 0
};

const THEME_VAR_MAP = {
    accent: '--accent-primary',
    accentGlow: '--accent-glow',
    textOnAccent: '--text-on-accent',
    bgDeep: '--bg-deep',
    bgSurface: '--bg-surface',
    bgFocus: '--bg-focus',
    bgElevated: '--bg-elevated',
    bgElevatedHover: '--bg-elevated-hover',
    bgElevatedActive: '--bg-elevated-active',
    textMain: '--text-main',
    textMuted: '--text-muted',
    borderColor: '--border-color',
    success: '--success',
    danger: '--danger',
    dangerDark: '--danger-dark',
    favorite: '--favorite',
    rating: '--rating',
    ratingStrong: '--rating-strong'
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hexToRgb = (hex, fallback = { r: 139, g: 92, b: 246 }) => {
    if (!hex) return fallback;
    const sanitized = hex.replace('#', '');
    const expanded = sanitized.length === 3
        ? sanitized.split('').map(c => c + c).join('')
        : sanitized;

    const int = parseInt(expanded, 16);
    return {
        r: (int >> 16) & 255,
        g: (int >> 8) & 255,
        b: int & 255
    };
};

const rgbToHex = (r, g, b) => {
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const shadeColor = (hex, percent) => {
    const { r, g, b } = hexToRgb(hex);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent) / 100;
    const nr = Math.round((t - r) * p) + r;
    const ng = Math.round((t - g) * p) + g;
    const nb = Math.round((t - b) * p) + b;
    return rgbToHex(clamp(nr, 0, 255), clamp(ng, 0, 255), clamp(nb, 0, 255));
};

export const ThemeService = {
    current: { ...defaultTheme },

    load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { ...defaultTheme };
        try {
            const parsed = JSON.parse(stored);
            if (!parsed || typeof parsed.accent !== 'string') return { ...defaultTheme };
            return {
                ...defaultTheme,
                ...parsed,
                updatedAt: parsed.updatedAt || 0
            };
        } catch {
            return { ...defaultTheme };
        }
    },

    save(theme) {
        const normalized = {
            ...defaultTheme,
            ...theme,
            updatedAt: theme.updatedAt || Date.now()
        };
        this.current = normalized;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        this.apply(normalized);
    },

    apply(theme) {
        const root = document.documentElement;
        const merged = { ...defaultTheme, ...(theme || {}) };

        Object.entries(THEME_VAR_MAP).forEach(([key, cssVar]) => {
            if (merged[key]) {
                root.style.setProperty(cssVar, merged[key]);
            }
        });

        const accent = merged.accent || defaultTheme.accent;
        const accentGlow = merged.accentGlow || shadeColor(accent, -20);
        const textMain = merged.textMain || defaultTheme.textMain;
        const danger = merged.danger || defaultTheme.danger;
        const favorite = merged.favorite || defaultTheme.favorite;
        const rating = merged.ratingStrong || defaultTheme.ratingStrong;

        const accentRgb = hexToRgb(accent);
        const textMainRgb = hexToRgb(textMain, { r: 226, g: 232, b: 240 });
        const dangerRgb = hexToRgb(danger, { r: 220, g: 38, b: 38 });
        const favoriteRgb = hexToRgb(favorite, { r: 244, g: 63, b: 94 });
        const ratingRgb = hexToRgb(rating, { r: 255, g: 204, b: 0 });

        root.style.setProperty('--accent-glow', accentGlow);
        root.style.setProperty('--accent-primary-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
        root.style.setProperty('--text-main-rgb', `${textMainRgb.r}, ${textMainRgb.g}, ${textMainRgb.b}`);
        root.style.setProperty('--danger-rgb', `${dangerRgb.r}, ${dangerRgb.g}, ${dangerRgb.b}`);
        root.style.setProperty('--favorite-rgb', `${favoriteRgb.r}, ${favoriteRgb.g}, ${favoriteRgb.b}`);
        root.style.setProperty('--rating-rgb', `${ratingRgb.r}, ${ratingRgb.g}, ${ratingRgb.b}`);
        root.style.setProperty('--danger-soft', `rgba(${dangerRgb.r}, ${dangerRgb.g}, ${dangerRgb.b}, 0.12)`);
    },

    init() {
        const theme = this.load();
        this.current = theme;
        this.apply(theme);
    },

    reset() {
        this.save({ ...defaultTheme });
    },

    getTheme() {
        return this.current || this.load();
    }
};
