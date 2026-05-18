import { useState } from 'react';
import { View, Text, Share, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii } from '@/constants/theme';
import { successNotification } from '@/lib/haptics';
import { useI18n } from '@/hooks/use-i18n';

export default function OnboardingScreen() {
  const router = useRouter();
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
  const { t: tr } = useI18n();
  const t = colors.light;
  const [copied, setCopied] = useState(false);
  const id = publicId ?? '';

  async function copy() {
    await Clipboard.setStringAsync(id);
    successNotification();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    await Share.share({
      message: tr('onboarding.shareMessage', { id }),
    });
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.background,
        padding: spacing['2xl'],
        justifyContent: 'center',
        gap: spacing['2xl'],
      }}
    >
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <Icon name="checkmark-circle" size={56} tone="primary" />
        <Text style={[typography.h1, { color: t.text }]}>
          {tr('onboarding.allSet')}
        </Text>
        <Text
          style={[
            typography.body,
            { color: t.textSecondary, textAlign: 'center' },
          ]}
        >
          {tr('onboarding.shareIdSubtitle')}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: t.surface,
          borderRadius: radii.lg,
          borderCurve: 'continuous',
          padding: spacing.xl,
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <Text style={[typography.caption, { color: t.textTertiary }]}>
          {tr('onboarding.yourUserId')}
        </Text>
        <Text
          selectable
          style={[
            typography.display,
            { color: t.primary, letterSpacing: 2 },
          ]}
        >
          {id}
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Pressable
            onPress={copy}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radii.pill,
              backgroundColor: t.primaryLight,
            }}
          >
            <Icon
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              tone="primary"
            />
            <Text style={[typography.label, { color: t.primary }]}>
              {copied ? tr('onboarding.copied') : tr('onboarding.copy')}
            </Text>
          </Pressable>
          <Pressable
            onPress={share}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.sm,
              borderRadius: radii.pill,
              backgroundColor: t.primaryLight,
            }}
          >
            <Icon name="share-outline" size={16} tone="primary" />
            <Text style={[typography.label, { color: t.primary }]}>
              {tr('onboarding.share')}
            </Text>
          </Pressable>
        </View>
      </View>

      <Button
        title={tr('onboarding.continue')}
        onPress={() => router.replace('/(tabs)')}
        fullWidth
      />
    </View>
  );
}
