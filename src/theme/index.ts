export const colors = {
  background: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    tertiary: '#1C1C28',
  },
  surface: {
    default: '#1C1C28',
    elevated: '#252536',
    hover: '#2D2D40',
  },
  accent: {
    primary: '#6366F1',
    secondary: '#8B5CF6',
    tertiary: '#3B82F6',
  },
  text: {
    primary: '#F5F5F7',
    secondary: '#A0A0AB',
    tertiary: '#6B6B76',
    inverse: '#0A0A0F',
  },
  border: {
    default: '#2D2D40',
    subtle: '#1F1F2E',
    emphasis: '#3D3D52',
  },
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;
