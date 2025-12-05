export const colors = {
  primary: '#6366f1', // Indigo
  secondary: '#8b5cf6', // Purple
  success: '#10b981', // Green
  danger: '#ef4444', // Red
  warning: '#f59e0b', // Amber
  
  background: '#ffffff',
  surface: '#f9fafb',
  card: '#ffffff',
  
  text: '#111827',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',
  
  border: '#e5e7eb',
  divider: '#f3f4f6',
  
  // Dark mode (for future)
  dark: {
    background: '#111827',
    surface: '#1f2937',
    card: '#374151',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};
