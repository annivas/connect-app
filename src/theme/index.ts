export const colors = {
  background: {
    primary: '#FFF8F0',     // Warm cream (main background)
    secondary: '#FFF1E6',   // Slightly deeper cream (input areas, footers)
    tertiary: '#FFE8D6',    // Peachy cream (cards, grouped sections)
  },
  surface: {
    default: '#FFE8D6',     // Card backgrounds
    elevated: '#FFFFFF',    // Floating surfaces (modals, popovers, inputs)
    hover: '#FFD6BA',       // Pressed/hover state
  },
  accent: {
    primary: '#D4764E',     // Warm terracotta (primary buttons, active tabs, own bubbles)
    secondary: '#C2956B',   // Warm gold-brown (secondary actions, edit mode)
    tertiary: '#8B6F5A',    // Muted brown (tertiary elements)
  },
  text: {
    primary: '#2D1F14',     // Dark warm brown (headings, body text)
    secondary: '#7A6355',   // Medium warm brown (secondary text, icons)
    tertiary: '#A8937F',    // Light warm brown (timestamps, placeholders)
    inverse: '#FFFFFF',     // White text on accent backgrounds
  },
  border: {
    default: '#E8D5C4',     // Warm beige border
    subtle: '#F0E2D4',      // Very subtle warm divider
    emphasis: '#D4BFA8',    // Stronger warm border
  },
  status: {
    success: '#2D9F6F',     // Warm emerald
    warning: '#D4964E',     // Warm amber (close to accent)
    error: '#C94F4F',       // Warm red
    info: '#5B8EC9',        // Muted blue
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
