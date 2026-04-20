import { View, Text } from 'react-native';

export default function MapView({ style, children }: any) {
  return (
    <View style={[style, { backgroundColor: '#E8F0F8', alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#666' }}>Map not available on web</Text>
    </View>
  );
}

export function Marker(_props: any) { return null; }
export const PROVIDER_GOOGLE = 'google';
