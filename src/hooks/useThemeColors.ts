import { useColorScheme } from 'nativewind';
import { colors, darkColors } from '../theme';

/**
 * Returns the active color palette based on the current color scheme.
 * Use this in components that need hardcoded color values for props
 * like `color=`, `backgroundColor=`, `tintColor=`, etc.
 *
 * For className-based styling, CSS variables handle theming automatically.
 */
export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? darkColors : colors;
}
