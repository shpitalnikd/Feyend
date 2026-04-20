import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/lib/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) setProfile(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  if (!profile) return <Text style={{ margin: 24 }}>User not found.</Text>;

  return (
    <>
      <Stack.Screen options={{ title: profile.display_name }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24, gap: 16 }}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {profile.display_name?.[0]?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={styles.name}>{profile.display_name}</Text>

        <View style={styles.scoreRow}>
          <ScoreStat label="Rating" value={profile.avg_rating?.toFixed(1) ?? '—'} emoji="⭐" />
          <ScoreStat label="Posts" value={String(profile.posts_count ?? 0)} emoji="📦" />
          <ScoreStat
            label="Pay rate"
            value={profile.paid_out_percent != null ? `${profile.paid_out_percent.toFixed(0)}%` : '—'}
            emoji="💰"
          />
        </View>
      </ScrollView>
    </>
  );
}

function ScoreStat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  avatarInitial: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8F8F8',
    borderRadius: 16,
    padding: 16,
  },
  stat: { alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#8E8E93' },
});
