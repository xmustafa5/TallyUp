import { useState } from 'react';
import { View, Text, Share, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, typography, radii } from '@/constants/theme';
import { successNotification } from '@/lib/haptics';

export default function OnboardingScreen() {
  const router = useRouter();
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
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
      message: `Add me on TallyUp! My User ID is ${id}`,
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
          You&apos;re all set
        </Text>
        <Text
          style={[
            typography.body,
            { color: t.textSecondary, textAlign: 'center' },
          ]}
        >
          Share your User ID so friends can invite you to challenge rooms.
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
          YOUR USER ID
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
              {copied ? 'Copied' : 'Copy'}
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
              Share
            </Text>
          </Pressable>
        </View>
      </View>

      <Button
        title="Continue"
        onPress={() => router.replace('/(tabs)')}
        fullWidth
      />
    </View>
  );
}
