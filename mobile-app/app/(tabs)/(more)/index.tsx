import { View, Text } from 'react-native';

export default function MoreScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>More</Text>
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
        Settings coming in Phase 6
      </Text>
    </View>
  );
}
