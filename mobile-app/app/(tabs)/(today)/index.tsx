import { View, Text } from 'react-native';

export default function TodayScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Today</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
        Prayer tracker coming in Phase 4
      </Text>
    </View>
  );
}
