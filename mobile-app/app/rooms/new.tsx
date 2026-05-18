import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateRoom } from '@/hooks/use-rooms';
import { useTemplates } from '@/hooks/use-templates';
import { useI18n } from '@/hooks/use-i18n';
import { TextInput } from '@/components/ui/text-input';
import { Button } from '@/components/ui/button';
import { colors, spacing, typography, radii } from '@/constants/theme';
import type {
  PeriodType,
  WinnerRule,
  LoserRule,
  RoomTemplate,
} from '@/types/tallyup';

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = colors.light;
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.label, { color: t.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                borderRadius: radii.pill,
                backgroundColor: active ? t.primary : t.surface,
                borderWidth: 1.5,
                borderColor: active ? t.primary : t.border,
              }}
            >
              <Text
                style={[
                  typography.caption,
                  { color: active ? '#FFFFFF' : t.text },
                ]}
              >
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// 'any' is a UI-only sentinel for the optional weekly start day -> sent
// as null (omit a fixed start day).
type StartDay = 'any' | '0' | '1' | '2' | '3' | '4' | '5' | '6';

export default function CreateRoomScreen() {
  const router = useRouter();
  const { t: tr } = useI18n();
  const t = colors.light;
  const createRoom = useCreateRoom();
  const { data: templates } = useTemplates();

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    null,
  );
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [stake, setStake] = useState('');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [customDays, setCustomDays] = useState('7');
  const [startDayOfWeek, setStartDayOfWeek] = useState<StartDay>('any');
  const [startDayOfMonth, setStartDayOfMonth] = useState('');
  const [winnerRule, setWinnerRule] = useState<WinnerRule>('highest');
  const [winnerN, setWinnerN] = useState('3');
  const [loserRule, setLoserRule] = useState<LoserRule>('lowest');
  const [loserN, setLoserN] = useState('3');

  function applyTemplate(tpl: RoomTemplate) {
    setSelectedTemplate(tpl.code);
    setName(tpl.name);
    setIcon(tpl.icon);
    setStake(tpl.stake ?? '');
    setPeriod(tpl.periodType);
    if (tpl.customDays != null) setCustomDays(String(tpl.customDays));
    setWinnerRule(tpl.winnerRule);
    if (tpl.winnerN != null) setWinnerN(String(tpl.winnerN));
    setLoserRule(tpl.loserRule);
    if (tpl.loserN != null) setLoserN(String(tpl.loserN));
  }

  function startFromScratch() {
    setSelectedTemplate(null);
  }

  function submit() {
    if (!name.trim()) {
      Alert.alert(
        tr('createRoom.required'),
        tr('createRoom.enterRoomName'),
      );
      return;
    }
    const usesDays = period === 'custom' || period === 'oneshot';
    const days = Number(customDays);
    if (usesDays && (!Number.isInteger(days) || days < 1 || days > 365)) {
      Alert.alert(tr('createRoom.invalid'), tr('createRoom.daysRange'));
      return;
    }

    const wN = Number(winnerN);
    if (winnerRule === 'top_n' && (!Number.isInteger(wN) || wN < 1)) {
      Alert.alert(tr('createRoom.invalid'), tr('createRoom.topNMin'));
      return;
    }
    const lN = Number(loserN);
    if (loserRule === 'bottom_n' && (!Number.isInteger(lN) || lN < 1)) {
      Alert.alert(tr('createRoom.invalid'), tr('createRoom.bottomNMin'));
      return;
    }

    let monthDay: number | null = null;
    if (period === 'month' && startDayOfMonth.trim()) {
      const d = Number(startDayOfMonth);
      if (!Number.isInteger(d) || d < 1 || d > 28) {
        Alert.alert(
          tr('createRoom.invalid'),
          tr('createRoom.monthDayRange'),
        );
        return;
      }
      monthDay = d;
    }

    createRoom.mutate(
      {
        name: name.trim(),
        icon: icon || null,
        periodType: period,
        customDays: usesDays ? days : null,
        startDayOfWeek:
          period === 'week' && startDayOfWeek !== 'any'
            ? Number(startDayOfWeek)
            : null,
        startDayOfMonth: monthDay,
        winnerRule,
        winnerN: winnerRule === 'top_n' ? wN : null,
        loserRule,
        loserN: loserRule === 'bottom_n' ? lN : null,
        capAtTarget: true,
        stake: stake || null,
      },
      {
        onSuccess: (room) => router.replace(`/rooms/${room.id}/settings`),
        onError: (e: unknown) =>
          Alert.alert(
            tr('createRoom.error'),
            (e as { response?: { data?: { message?: string } } })?.response
              ?.data?.message ?? tr('createRoom.couldNotCreate'),
          ),
      },
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}
    >
      {templates && templates.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.label, { color: t.text }]}>
            {tr('createRoom.startFromTemplate')}
          </Text>
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={startFromScratch}
              style={{
                padding: spacing.md,
                borderRadius: radii.md,
                borderCurve: 'continuous',
                backgroundColor:
                  selectedTemplate === null ? t.primary : t.surface,
                borderWidth: 1.5,
                borderColor:
                  selectedTemplate === null ? t.primary : t.border,
              }}
            >
              <Text
                style={[
                  typography.body,
                  {
                    color:
                      selectedTemplate === null ? '#FFFFFF' : t.text,
                  },
                ]}
              >
                {tr('createRoom.startFromScratch')}
              </Text>
            </Pressable>
            {templates.map((tpl) => {
              const active = selectedTemplate === tpl.code;
              return (
                <Pressable
                  key={tpl.code}
                  onPress={() => applyTemplate(tpl)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    padding: spacing.md,
                    borderRadius: radii.md,
                    borderCurve: 'continuous',
                    backgroundColor: active ? t.primaryLight : t.surface,
                    borderWidth: 1.5,
                    borderColor: active ? t.primary : t.border,
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{tpl.icon}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={[typography.label, { color: t.text }]}
                    >
                      {tpl.name}
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: t.textTertiary },
                      ]}
                    >
                      {tpl.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={{ width: 72 }}>
          <TextInput
            label={tr('createRoom.icon')}
            placeholder="🏋️"
            value={icon}
            onChangeText={setIcon}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label={tr('createRoom.roomName')}
            placeholder={tr('createRoom.roomNamePlaceholder')}
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      <TextInput
        label={tr('createRoom.stake')}
        placeholder={tr('createRoom.stakePlaceholder')}
        value={stake}
        onChangeText={setStake}
      />

      <Chips
        label={tr('createRoom.cycleLength')}
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: tr('createRoom.periodWeek') },
          { value: 'month', label: tr('createRoom.periodMonth') },
          { value: 'custom', label: tr('createRoom.periodCustom') },
          { value: 'oneshot', label: tr('createRoom.periodOneshot') },
        ]}
      />
      {(period === 'custom' || period === 'oneshot') && (
        <TextInput
          label={tr('createRoom.numberOfDays')}
          value={customDays}
          onChangeText={setCustomDays}
          keyboardType="number-pad"
        />
      )}
      {period === 'week' && (
        <Chips
          label={tr('createRoom.startDay')}
          value={startDayOfWeek}
          onChange={setStartDayOfWeek}
          options={[
            { value: 'any', label: tr('createRoom.dayAny') },
            { value: '0', label: tr('createRoom.daySun') },
            { value: '1', label: tr('createRoom.dayMon') },
            { value: '2', label: tr('createRoom.dayTue') },
            { value: '3', label: tr('createRoom.dayWed') },
            { value: '4', label: tr('createRoom.dayThu') },
            { value: '5', label: tr('createRoom.dayFri') },
            { value: '6', label: tr('createRoom.daySat') },
          ]}
        />
      )}
      {period === 'month' && (
        <TextInput
          label={tr('createRoom.startDayOfMonth')}
          placeholder="1"
          value={startDayOfMonth}
          onChangeText={setStartDayOfMonth}
          keyboardType="number-pad"
        />
      )}

      <Chips
        label={tr('createRoom.winnerRule')}
        value={winnerRule}
        onChange={setWinnerRule}
        options={[
          { value: 'none', label: tr('createRoom.winnerNone') },
          { value: 'highest', label: tr('createRoom.winnerHighest') },
          { value: 'lowest', label: tr('createRoom.winnerLowest') },
          { value: 'top_n', label: tr('createRoom.winnerTopN') },
          { value: 'threshold', label: tr('createRoom.winnerThreshold') },
        ]}
      />
      {winnerRule === 'top_n' && (
        <TextInput
          label={tr('createRoom.numberOfWinners')}
          value={winnerN}
          onChangeText={setWinnerN}
          keyboardType="number-pad"
        />
      )}
      <Chips
        label={tr('createRoom.loserRule')}
        value={loserRule}
        onChange={setLoserRule}
        options={[
          { value: 'none', label: tr('createRoom.loserNone') },
          { value: 'lowest', label: tr('createRoom.loserLowest') },
          { value: 'highest', label: tr('createRoom.loserHighest') },
          { value: 'bottom_n', label: tr('createRoom.loserBottomN') },
          { value: 'threshold', label: tr('createRoom.loserThreshold') },
        ]}
      />
      {loserRule === 'bottom_n' && (
        <TextInput
          label={tr('createRoom.numberOfLosers')}
          value={loserN}
          onChangeText={setLoserN}
          keyboardType="number-pad"
        />
      )}

      <Button
        title={tr('createRoom.create')}
        onPress={submit}
        loading={createRoom.isPending}
        fullWidth
      />
    </ScrollView>
  );
}
