import { View, Text } from 'react-native';

export default function MakeupScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Makeup</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
        Makeup prayers coming in Phase 5
      </Text>
    </View>
  );
}
