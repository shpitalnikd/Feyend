import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Request, Claim } from '@/lib/types';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [request, setRequest] = useState<Request | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    fetchRequest();
  }, [id]);

  async function fetchRequest() {
    const { data } = await supabase
      .from('requests')
      .select('*, poster:profiles(*)')
      .eq('id', id)
      .single();
    if (data) setRequest(data);

    const { data: claimsData } = await supabase
      .from('claims')
      .select('*, finder:profiles(*)')
      .eq('request_id', id);
    if (claimsData) setClaims(claimsData);
    setLoading(false);
  }

  async function handleClaim() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled) return;

    setClaiming(true);
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop();
    const fileName = `${Date.now()}.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage
      .from('claim-photos')
      .upload(fileName, blob);

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      setClaiming(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('claim-photos')
      .getPublicUrl(fileName);

    const { error } = await supabase.from('claims').insert({
      request_id: id,
      finder_id: currentUserId,
      photo_url: publicUrl,
      status: 'pending',
    });

    if (!error) {
      await supabase.from('requests').update({ status: 'claimed' }).eq('id', id);
      Alert.alert('Claimed!', 'Your photo proof has been sent to the requester.');
      fetchRequest();
    } else {
      Alert.alert('Error', error.message);
    }
    setClaiming(false);
  }

  async function handleAcceptClaim(claimId: string) {
    await supabase.from('claims').update({ status: 'accepted' }).eq('id', claimId);
    await supabase.from('requests').update({ status: 'completed' }).eq('id', id);
    Alert.alert('Find accepted!', 'The request is now marked complete.');
    fetchRequest();
  }

  async function handleRejectClaim(claimId: string) {
    await supabase.from('claims').update({ status: 'rejected' }).eq('id', claimId);
    await supabase.from('requests').update({ status: 'open' }).eq('id', id);
    fetchRequest();
  }

  if (loading) return <ActivityIndicator style={{ flex: 1, marginTop: 40 }} />;
  if (!request) return <Text style={{ margin: 24 }}>Request not found.</Text>;

  const isOwner = currentUserId === request.poster_id;
  const pendingClaims = claims.filter((c) => c.status === 'pending');

  return (
    <>
      <Stack.Screen options={{ title: request.title }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {request.photo_url && (
          <Image source={{ uri: request.photo_url }} style={styles.heroImage} />
        )}
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.description}>{request.description}</Text>

          <View style={styles.tagRow}>
            {request.store_name && (
              <Text style={styles.tag}>📍 {request.store_name}</Text>
            )}
            {request.reward_amount ? (
              <Text style={[styles.tag, { color: '#34C759' }]}>
                💰 ${request.reward_amount} reward
              </Text>
            ) : null}
            <Text style={styles.tag}>⏱ {getTimeLeft(request.expires_at)}</Text>
          </View>

          {request.poster && (
            <View style={styles.posterRow}>
              <Text style={styles.posterName}>{request.poster.display_name}</Text>
              <Text style={styles.posterScore}>
                ⭐ {request.poster.avg_rating?.toFixed(1) ?? '—'} · {request.poster.posts_count} posts · {request.poster.paid_out_percent?.toFixed(0) ?? '—'}% pay rate
              </Text>
            </View>
          )}

          {request.status !== 'open' && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor(request.status) }]}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>
                {request.status.toUpperCase()}
              </Text>
            </View>
          )}

          {!isOwner && request.status === 'open' && (
            <Pressable
              style={styles.claimBtn}
              onPress={handleClaim}
              disabled={claiming}
            >
              {claiming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.claimBtnText}>📸 I Found It</Text>
              )}
            </Pressable>
          )}

          {isOwner && pendingClaims.length > 0 && (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>
                Pending Claims ({pendingClaims.length})
              </Text>
              {pendingClaims.map((claim) => (
                <View key={claim.id} style={styles.claimCard}>
                  <Image source={{ uri: claim.photo_url }} style={styles.claimPhoto} />
                  <Text style={styles.claimFinder}>{claim.finder?.display_name}</Text>
                  <View style={styles.tagRow}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#34C759' }]}
                      onPress={() => handleAcceptClaim(claim.id)}
                    >
                      <Text style={styles.actionBtnText}>✓ Accept</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]}
                      onPress={() => handleRejectClaim(claim.id)}
                    >
                      <Text style={styles.actionBtnText}>✗ Reject</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function getTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function statusColor(status: string) {
  if (status === 'completed') return '#34C759';
  if (status === 'claimed') return '#FF9500';
  return '#999';
}

const styles = StyleSheet.create({
  heroImage: { width: '100%', height: 220 },
  title: { fontSize: 22, fontWeight: '700' },
  description: { fontSize: 16, color: '#444', lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    fontSize: 14,
    color: '#555',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  posterRow: {
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E0E0E0',
    paddingTop: 12,
  },
  posterName: { fontSize: 15, fontWeight: '600' },
  posterScore: { fontSize: 13, color: '#888' },
  claimBtn: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  claimBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  claimCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  claimPhoto: { width: '100%', height: 180, borderRadius: 8 },
  claimFinder: { fontSize: 15, fontWeight: '600' },
  actionBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
