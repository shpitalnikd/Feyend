import { useState, useEffect } from 'react';
import {
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  StyleSheet,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Stack, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

const EXPIRY_OPTIONS = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '3 days', hours: 72 },
  { label: '1 week', hours: 168 },
];

export default function PostScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [storeName, setStoreName] = useState('');
  const [reward, setReward] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [expiryHours, setExpiryHours] = useState(24);
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [locationLabel, setLocationLabel] = useState<string>('Detecting location...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationLabel('Location permission denied');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(loc.coords);
      if (place) {
        const label = [place.name, place.city, place.region].filter(Boolean).join(', ');
        setLocationLabel(label || `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    })();
  }, []);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  }

  async function submit() {
    if (!title.trim()) {
      Alert.alert('Missing info', 'Please enter an item name.');
      return;
    }
    if (!coords) {
      Alert.alert('Location unavailable', 'Please allow location access to post a request.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let photoUrl: string | null = null;
    if (photo) {
      const ext = photo.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      const response = await fetch(photo);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('item-photos')
        .upload(fileName, blob);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('item-photos')
          .getPublicUrl(fileName);
        photoUrl = publicUrl;
      }
    }

    const expiresAt = new Date(Date.now() + expiryHours * 3600000).toISOString();

    const { error } = await supabase.from('requests').insert({
      poster_id: user.id,
      title: title.trim(),
      description: description.trim(),
      store_name: storeName.trim() || null,
      reward_amount: reward ? parseFloat(reward) : null,
      photo_url: photoUrl,
      location: `POINT(${coords.lng} ${coords.lat})`,
      lat: coords.lat,
      lng: coords.lng,
      radius_km: radiusKm,
      expires_at: expiresAt,
      status: 'open',
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Posted!', 'Your request is now live on the map.', [
        { text: 'OK', onPress: () => router.push('/(tabs)/feed') },
      ]);
      setTitle('');
      setDescription('');
      setStoreName('');
      setReward('');
      setPhoto(null);
      setExpiryHours(24);
      setRadiusKm(10);
    }
    setLoading(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Post a Request', headerLargeTitle: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ padding: 16, gap: 14 }}
        >
          <Text style={styles.sectionHeader}>What are you looking for?</Text>
          <TextInput
            placeholder="Item name (e.g. Nike Air Max size 10)"
            value={title}
            onChangeText={setTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Description — color, brand, size, any details..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
          />
          <TextInput
            placeholder="Store name (optional)"
            value={storeName}
            onChangeText={setStoreName}
            style={styles.input}
          />
          <TextInput
            placeholder="Reward amount in $ (optional)"
            value={reward}
            onChangeText={setReward}
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <View style={styles.locationBox}>
            <Text style={styles.locationLabel}>📍 {locationLabel}</Text>
          </View>

          <Text style={styles.sectionHeader}>Search radius: {radiusKm} km</Text>
          <Slider
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={radiusKm}
            onValueChange={setRadiusKm}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E0E0E0"
          />

          <Text style={styles.sectionHeader}>Expires in</Text>
          <View style={styles.expiryRow}>
            {EXPIRY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.hours}
                onPress={() => setExpiryHours(opt.hours)}
                style={[
                  styles.expiryChip,
                  expiryHours === opt.hours && styles.expiryChipActive,
                ]}
              >
                <Text style={{ color: expiryHours === opt.hours ? '#fff' : '#333', fontSize: 13 }}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={pickPhoto} style={styles.photoBtn}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photoPreview} />
            ) : (
              <Text style={{ color: '#007AFF' }}>📷 Add photo (optional)</Text>
            )}
          </Pressable>

          <Pressable onPress={submit} disabled={loading} style={styles.submitBtn}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Post Request</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 17, fontWeight: '600', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#F8F8F8',
  },
  locationBox: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8F8F8',
  },
  locationLabel: { fontSize: 14, color: '#555' },
  expiryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expiryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F8F8',
  },
  expiryChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  photoBtn: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  photoPreview: { width: '100%', height: 180, borderRadius: 8 },
  submitBtn: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
