/**
 * Dodo Payments Inline Checkout Theme Configuration
 *
 * Apple-like professional theme matching Durrah Exams design system
 * Glassmorphic aesthetic with blue primary colors and proper dark mode support
 */

import type { ThemeConfig } from 'dodopayments-checkout';

export const DURRAH_DODO_THEME: ThemeConfig = {
  light: {
    // Background colors - Apple-like subtle grays
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F9FAFB", // gray-50

    // Border colors - Subtle but defined
    borderPrimary: "#E5E7EB", // gray-200
    borderSecondary: "#9CA3AF", // gray-400
    inputFocusBorder: "#3B82F6", // blue-500

    // Text colors - High contrast for readability
    textPrimary: "#111827", // gray-900
    textSecondary: "#6B7280", // gray-500
    textPlaceholder: "#9CA3AF", // gray-400
    textError: "#DC2626", // red-600
    textSuccess: "#059669", // emerald-600

    // Button colors - Matching project blue
    buttonPrimary: "#2563EB", // blue-600
    buttonPrimaryHover: "#1D4ED8", // blue-700
    buttonTextPrimary: "#FFFFFF",
    buttonSecondary: "#F3F4F6", // gray-100
    buttonSecondaryHover: "#E5E7EB", // gray-200
    buttonTextSecondary: "#374151", // gray-700
  },

  dark: {
    // Background colors - True black with slight warmth
    bgPrimary: "#0D0D0D", // Dodo recommended dark bg
    bgSecondary: "#1A1A1A",

    // Border colors - Subtle in dark mode
    borderPrimary: "#374151", // gray-700
    borderSecondary: "#4B5563", // gray-600
    inputFocusBorder: "#3B82F6", // blue-500

    // Text colors - Softer whites for comfort
    textPrimary: "#F9FAFB", // gray-50
    textSecondary: "#9CA3AF", // gray-400
    textPlaceholder: "#6B7280", // gray-500
    textError: "#F87171", // red-400
    textSuccess: "#34D399", // emerald-400

    // Button colors - Same blue, but adjusted for dark
    buttonPrimary: "#2563EB", // blue-600
    buttonPrimaryHover: "#1D4ED8", // blue-700
    buttonTextPrimary: "#FFFFFF",
    buttonSecondary: "#374151", // gray-700
    buttonSecondaryHover: "#4B5563", // gray-600
    buttonTextSecondary: "#F9FAFB", // gray-50
  },

  // Border radius - Rounded for Apple-like aesthetic
  radius: "12px", // Matches rounded-xl in project
};

/**
 * Alternative theme with Indigo accents (matching landing page gradients)
 */
export const DURRAH_DODO_THEME_INDIGO: ThemeConfig = {
  light: {
    bgPrimary: "#FFFFFF",
    bgSecondary: "#F9FAFB",
    borderPrimary: "#E5E7EB",
    borderSecondary: "#9CA3AF",
    inputFocusBorder: "#6366F1", // indigo-500
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textPlaceholder: "#9CA3AF",
    textError: "#DC2626",
    textSuccess: "#059669",
    buttonPrimary: "#6366F1", // indigo-500
    buttonPrimaryHover: "#4F46E5", // indigo-600
    buttonTextPrimary: "#FFFFFF",
    buttonSecondary: "#F3F4F6",
    buttonSecondaryHover: "#E5E7EB",
    buttonTextSecondary: "#374151",
  },
  dark: {
    bgPrimary: "#0D0D0D",
    bgSecondary: "#1A1A1A",
    borderPrimary: "#374151",
    borderSecondary: "#4B5563",
    inputFocusBorder: "#6366F1",
    textPrimary: "#F9FAFB",
    textSecondary: "#9CA3AF",
    textPlaceholder: "#6B7280",
    textError: "#F87171",
    textSuccess: "#34D399",
    buttonPrimary: "#6366F1",
    buttonPrimaryHover: "#4F46E5",
    buttonTextPrimary: "#FFFFFF",
    buttonSecondary: "#374151",
    buttonSecondaryHover: "#4B5563",
    buttonTextSecondary: "#F9FAFB",
  },
  radius: "12px",
};

// Export default theme
export default DURRAH_DODO_THEME;
