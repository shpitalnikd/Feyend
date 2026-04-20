import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Request, Claim } from '@/lib/types';

type Tab = 'posts' | 'finds';

export default function ActivityScreen() {
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<Request[]>([]);
  const [finds, setFinds] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  async function fetchActivity() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [postsRes, findsRes] = await Promise.all([
      supabase
        .from('requests')
        .select('*')
        .eq('poster_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('claims')
        .select('*, request:requests(title)')
        .eq('finder_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    if (postsRes.data) setPosts(postsRes.data);
    if (findsRes.data) setFinds(findsRes.data);
    setLoading(false);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.segmented}>
        <Pressable
          style={[styles.segment, tab === 'posts' && styles.segmentActive]}
          onPress={() => setTab('posts')}
        >
          <Text style={[styles.segmentText, tab === 'posts' && styles.segmentTextActive]}>
            My Posts
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segment, tab === 'finds' && styles.segmentActive]}
          onPress={() => setTab('finds')}
        >
          <Text style={[styles.segmentText, tab === 'finds' && styles.segmentTextActive]}>
            My Finds
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />
      ) : tab === 'posts' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/(tabs)/feed/${item.id}`)}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {new Date(item.created_at).toLocaleDateString()}
                  {item.reward_amount ? ` · $${item.reward_amount} reward` : ''}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No posts yet.</Text>}
        />
      ) : (
        <FlatList
          data={finds}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/(tabs)/feed/${item.request_id}`)}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowTitle}>
                  {(item as any).request?.title ?? 'Request'}
                </Text>
                <Text style={styles.rowMeta}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <StatusBadge status={item.status} />
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No finds yet.</Text>}
        />
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: '#007AFF',
    claimed: '#FF9500',
    completed: '#34C759',
    expired: '#8E8E93',
    pending: '#FF9500',
    accepted: '#34C759',
    rejected: '#FF3B30',
  };
  return (
    <View style={[styles.badge, { backgroundColor: colors[status] ?? '#8E8E93' }]}>
      <Text style={styles.badgeText}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: 'row',
    margin: 12,
    borderRadius: 10,
    backgroundColor: '#F0F0F0',
    padding: 4,
  },
  segment: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: '#fff' },
  segmentText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  segmentTextActive: { color: '#000' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 13, color: '#8E8E93' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', marginTop: 40, color: '#8E8E93' },
});
