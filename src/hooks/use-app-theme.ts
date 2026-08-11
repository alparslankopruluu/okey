import { colors } from '../theme/tokens';
import { useAppStore } from '../stores/app-store';

export function useAppTheme() {
  const appearance = useAppStore((state) => state.appearance);
  return { appearance, colors: colors(appearance) };
}
