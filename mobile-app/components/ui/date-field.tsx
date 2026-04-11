import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  addMonths,
  format as dfFormat,
  getDaysInMonth,
  getDay,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { colors, format, radii, spacing, typography } from '@/constants/theme';
import { lightImpact, selectionFeedback } from '@/lib/haptics';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}

const AR_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const WEEKDAYS_AR = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

const formatArabic = (d: Date) =>
  `${format.toArabicDigits(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${format.toArabicDigits(d.getFullYear())}`;

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'اختر التاريخ',
  minimumDate,
  maximumDate,
  error,
}: DateFieldProps) {
  const theme = colors.light;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());
  const [mode, setMode] = useState<'day' | 'year'>('day');

  const handleOpen = () => {
    lightImpact();
    setViewDate(value ?? new Date());
    setMode('day');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setMode('day');
  };

  const handlePickDay = (day: number) => {
    selectionFeedback();
    const picked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(picked);
    handleClose();
  };

  const handlePickYear = (year: number) => {
    selectionFeedback();
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setMode('day');
  };

  const minDay = minimumDate ? startOfDay(minimumDate) : null;
  const maxDay = maximumDate ? startOfDay(maximumDate) : null;
  const isDayDisabled = (d: Date) => {
    const day = startOfDay(d);
    if (minDay && day < minDay) return true;
    if (maxDay && day > maxDay) return true;
    return false;
  };

  const cells = useMemo(() => {
    const daysInMonth = getDaysInMonth(viewDate);
    const firstWeekday = getDay(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
    );
    const list: (number | null)[] = [
      ...Array(firstWeekday).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    return list;
  }, [viewDate]);

  const years = useMemo(() => {
    const min = minimumDate?.getFullYear() ?? 1950;
    const max = maximumDate?.getFullYear() ?? new Date().getFullYear();
    const arr: number[] = [];
    for (let y = max; y >= min; y--) arr.push(y);
    return arr;
  }, [minimumDate, maximumDate]);

  const canGoPrev = (() => {
    if (!minDay) return true;
    const prev = addMonths(viewDate, -1);
    const lastOfPrev = new Date(
      prev.getFullYear(),
      prev.getMonth() + 1,
      0,
    );
    return lastOfPrev >= minDay;
  })();

  const canGoNext = (() => {
    if (!maxDay) return true;
    const next = addMonths(viewDate, 1);
    const firstOfNext = new Date(next.getFullYear(), next.getMonth(), 1);
    return firstOfNext <= maxDay;
  })();

  return (
    <View style={{ gap: 6 }}>
      <Text style={[typography.label, { color: theme.text }]}>{label}</Text>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) => ({
          backgroundColor: theme.surface,
          borderWidth: 1.5,
          borderColor: error ? theme.error : theme.border,
          borderRadius: radii.md,
          borderCurve: 'continuous',
          height: 52,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radii.pill,
            backgroundColor: theme.primaryLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="calendar" size={18} color={theme.primary} />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            color: value ? theme.text : theme.textTertiary,
            fontWeight: value ? '600' : '400',
          }}
        >
          {value ? formatArabic(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.textTertiary} />
      </Pressable>
      {error && <Text style={{ fontSize: 13, color: theme.error }}>{error}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(26,54,93,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: spacing.xl,
          }}
          onPress={handleClose}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: theme.card,
              borderRadius: radii['2xl'],
              borderCurve: 'continuous',
              padding: spacing.xl,
              boxShadow: '0 20px 40px rgba(26,54,93,0.2)',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: spacing.lg,
              }}
            >
              <Pressable
                onPress={() => canGoPrev && setViewDate(addMonths(viewDate, -1))}
                disabled={!canGoPrev || mode === 'year'}
                hitSlop={8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.pill,
                  backgroundColor: theme.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canGoPrev && mode === 'day' ? 1 : 0.3,
                }}
              >
                <Ionicons name="chevron-forward" size={18} color={theme.primary} />
              </Pressable>

              <Pressable
                onPress={() => setMode(mode === 'day' ? 'year' : 'day')}
                hitSlop={8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: radii.pill,
                  backgroundColor: theme.primaryLight,
                }}
              >
                <Text style={[typography.h3, { color: theme.primary }]}>
                  {AR_MONTHS[viewDate.getMonth()]}{' '}
                  {format.toArabicDigits(viewDate.getFullYear())}
                </Text>
                <Ionicons
                  name={mode === 'year' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={theme.primary}
                />
              </Pressable>

              <Pressable
                onPress={() => canGoNext && setViewDate(addMonths(viewDate, 1))}
                disabled={!canGoNext || mode === 'year'}
                hitSlop={8}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.pill,
                  backgroundColor: theme.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: canGoNext && mode === 'day' ? 1 : 0.3,
                }}
              >
                <Ionicons name="chevron-back" size={18} color={theme.primary} />
              </Pressable>
            </View>

            {mode === 'day' ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: spacing.xs,
                  }}
                >
                  {WEEKDAYS_AR.map((d) => (
                    <View
                      key={d}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}
                    >
                      <Text
                        style={{
                          ...typography.caption,
                          fontSize: 11,
                          color: theme.textTertiary,
                          fontWeight: '700',
                        }}
                      >
                        {d}
                      </Text>
                    </View>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {cells.map((day, i) => {
                    if (day === null) {
                      return (
                        <View
                          key={`e-${i}`}
                          style={{ width: `${100 / 7}%`, height: 44 }}
                        />
                      );
                    }
                    const cellDate = new Date(
                      viewDate.getFullYear(),
                      viewDate.getMonth(),
                      day,
                    );
                    const disabled = isDayDisabled(cellDate);
                    const selected = value ? isSameDay(cellDate, value) : false;
                    const isToday = isSameDay(cellDate, new Date());

                    return (
                      <Pressable
                        key={day}
                        disabled={disabled}
                        onPress={() => handlePickDay(day)}
                        style={({ pressed }) => ({
                          width: `${100 / 7}%`,
                          height: 44,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.6 : disabled ? 0.25 : 1,
                        })}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: radii.pill,
                            backgroundColor: selected
                              ? theme.primary
                              : 'transparent',
                            borderWidth: !selected && isToday ? 1.5 : 0,
                            borderColor:
                              !selected && isToday ? theme.accent : undefined,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: selected || isToday ? '700' : '500',
                              color: selected
                                ? '#FFFFFF'
                                : isToday
                                  ? theme.accent
                                  : theme.text,
                              fontVariant: ['tabular-nums'],
                            }}
                          >
                            {format.toArabicDigits(day)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <ScrollView
                style={{ maxHeight: 320 }}
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing.sm,
                    justifyContent: 'center',
                  }}
                >
                  {years.map((y) => {
                    const selected = y === viewDate.getFullYear();
                    return (
                      <Pressable
                        key={y}
                        onPress={() => handlePickYear(y)}
                        style={({ pressed }) => ({
                          width: 84,
                          height: 44,
                          borderRadius: radii.pill,
                          backgroundColor: selected
                            ? theme.primary
                            : theme.surfaceAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: selected ? '#FFFFFF' : theme.text,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {format.toArabicDigits(y)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: spacing.lg,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: theme.border,
              }}
            >
              <Pressable onPress={handleClose} hitSlop={8} style={{ padding: 6 }}>
                <Text style={[typography.label, { color: theme.textSecondary }]}>
                  إلغاء
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
