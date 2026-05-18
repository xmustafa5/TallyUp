import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  tone?: 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'inverse';
}

/**
 * Single icon entry point for the app (CLAUDE.md). Wraps Ionicons and
 * resolves a semantic `tone` to the light theme palette.
 */
export function Icon({ name, size = 24, color, tone = 'default' }: IconProps) {
  const t = colors.light;
  const resolved =
    color ??
    (tone === 'primary'
      ? t.primary
      : tone === 'muted'
        ? t.textTertiary
        : tone === 'danger'
          ? t.error
          : tone === 'success'
            ? t.success
            : tone === 'inverse'
              ? '#FFFFFF'
              : t.text);
  return <Ionicons name={name} size={size} color={resolved} />;
}
