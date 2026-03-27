import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useGapPeriods, useDeleteGapPeriod, useCalculation } from '@/hooks/use-gap-periods';
import { Button } from '@/components/ui/button';
import { colors } from '@/constants/theme';

export default function GapPeriodsScreen() {
  const theme = colors.light;
  const { data: periods, isLoading, refetch } = useGapPeriods();
  const { data: calculation } = useCalculation();
  const deletePeriod = useDeleteGapPeriod();

  const handleDelete = (id: string) => {
    Alert.alert('Delete Gap Period', 'Are you sure you want to delete this gap period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deletePeriod.mutate(id),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gap Periods',
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(tabs)/(more)/gap-periods/create')}
              style={{ padding: 4 }}
            >
              <Ionicons name="add-circle" size={26} color={theme.primary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingBottom: 40,
        }}
      >
        {(!periods || periods.length === 0) && !isLoading && (
          <View
            style={{
              backgroundColor: theme.card,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 32,
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
            <Text style={{ fontSize: 16, fontWeight: '500', color: theme.text }}>
              No Gap Periods Yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                textAlign: 'center',
              }}
            >
              Add the time periods when you were not praying regularly.
            </Text>
            <Button
              title="Add Your First Period"
              onPress={() => router.push('/(tabs)/(more)/gap-periods/create')}
            />
          </View>
        )}

        {periods?.map((period, index) => (
          <View
            key={period.id}
            style={{
              backgroundColor: theme.card,
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 16,
              gap: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
                  {format(parseISO(period.startDate), 'MMM d, yyyy')} -{' '}
                  {format(parseISO(period.endDate), 'MMM d, yyyy')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View
                    style={{
                      backgroundColor: theme.primaryLight,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      borderCurve: 'continuous',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '500', color: theme.primary }}>
                      {period.inputMethod === 'DATE_RANGE' ? 'Date Range' : 'Age Range'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {period.totalDays.toLocaleString()} days
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.textSecondary,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {period.totalPrayers.toLocaleString()} prayers
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() =>
                    router.push(`/(tabs)/(more)/gap-periods/${period.id}` as any)
                  }
                  style={{ padding: 6 }}
                >
                  <Ionicons name="pencil" size={18} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(period.id)}
                  style={{ padding: 6 }}
                >
                  <Ionicons name="trash" size={18} color={theme.error} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {calculation && periods && periods.length > 0 && (
          <View
            style={{
              backgroundColor: theme.primaryLight,
              borderRadius: 14,
              borderCurve: 'continuous',
              padding: 16,
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: theme.primary }}>
              Total Calculation
            </Text>
            <Text
              selectable
              style={{
                fontSize: 13,
                color: theme.primary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {calculation.totalDays.toLocaleString()} days ={' '}
              {calculation.totalPrayers.toLocaleString()} prayers
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}
