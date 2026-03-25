import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { lightImpact } from '@/lib/haptics';
import { colors } from '@/constants/theme';

interface PrayerToggleCardProps {
  name: string;
  completed: boolean;
  loading?: boolean;
  onToggle: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PrayerToggleCard({
  name,
  completed,
  loading = false,
  onToggle,
}: PrayerToggleCardProps) {
  const theme = colors.light;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    lightImpact();
    scale.value = withSpring(1.03, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1);
    });
    onToggle();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      disabled={loading}
      style={[
        {
          backgroundColor: completed ? theme.successLight : theme.card,
          borderRadius: 14,
          borderCurve: 'continuous',
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        },
        animatedStyle,
      ]}
    >
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: completed ? theme.success : theme.text,
        }}
      >
        {name}
      </Text>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: completed ? theme.success : theme.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={completed ? '#FFFFFF' : theme.textTertiary}
          />
        ) : completed ? (
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        ) : (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.textTertiary,
            }}
          />
        )}
      </View>
    </AnimatedPressable>
  );
}
