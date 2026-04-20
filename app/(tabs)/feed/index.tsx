import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import MapView, { Marker } from '@/components/AppMapView';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Request } from '@/lib/types';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const DEFAULT_REGION: Region = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function FeedScreen() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        });
      }
      fetchRequests();
    })();
  }, []);

  async function fetchRequests() {
    setLoading(true);
    const { data, error } = await supabase
      .from('requests')
      .select('*, poster:profiles(*)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setRequests(data);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView style={styles.map} region={region} showsUserLocation>
        {requests.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            title={r.title}
            description={r.reward_amount ? `$${r.reward_amount} reward` : undefined}
            onPress={() => router.push(`/(tabs)/feed/${r.id}`)}
          />
        ))}
      </MapView>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          style={styles.list}
          data={requests}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => <RequestCard request={item} />}
          ListEmptyComponent={
            <Text style={styles.empty}>No open requests nearby.</Text>
          }
        />
      )}
    </View>
  );
}

function RequestCard({ request }: { request: Request }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/(tabs)/feed/${request.id}`)}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.cardTitle}>{request.title}</Text>
        {request.store_name && (
          <Text style={styles.cardSub}>📍 {request.store_name}</Text>
        )}
        <Text style={styles.cardMeta}>
          {request.poster?.display_name} · ⭐ {request.poster?.avg_rating?.toFixed(1) ?? '—'} · {request.poster?.posts_count ?? 0} posts · {request.poster?.paid_out_percent?.toFixed(0) ?? '—'}% pay rate
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {request.reward_amount ? (
          <Text style={styles.reward}>${request.reward_amount}</Text>
        ) : null}
        <Text style={styles.cardMeta}>{getTimeLeft(request.expires_at)}</Text>
      </View>
    </Pressable>
  );
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

const styles = StyleSheet.create({
  map: { height: 260 },
  list: { flex: 1 },
  loader: { flex: 1, marginTop: 40 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 14, color: '#555' },
  cardMeta: { fontSize: 12, color: '#999' },
  reward: { fontSize: 16, fontWeight: '700', color: '#34C759' },
});
