import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import 'react-native-get-random-values';
import { TagChip } from '../../../src/components/ui/TagChip';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useHousehold } from '../../../src/contexts/HouseholdContext';
import { useNetworkStatus } from '../../../src/hooks/useNetworkStatus';
import { supabase } from '../../../src/lib/supabase';
import { enqueueSyncItem, getBoxes, saveBoxes } from '../../../src/lib/storage';
import { Box } from '../../../src/types';

// Simple UUID generator without crypto dependency issues
function generateUUID(): string {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 8];
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  return uuid;
}

const HOLIDAY_TAGS = [
  'Christmas 🎄', 'Halloween 🎃', 'Thanksgiving 🦃', 'Easter 🐣',
  '4th of July 🎆', 'Hanukkah 🕎', "New Year's 🥂", "Valentine's Day 💝",
  "St. Patrick's Day 🍀", "Mother's Day 💐", "Father's Day 👔",
  'Birthday 🎂', 'Diwali 🪔', 'Passover ✡️',
];

const GENERAL_TAGS = [
  'Fragile', 'Heavy', 'Seasonal', 'Clothes', 'Books', 'Electronics',
  'Tools', 'Kitchen', 'Decor', 'Sentimental', 'Documents', 'Sports',
  'Toys', 'Art', 'Camping', 'Outdoor', 'Furniture',
];

export default function CreateBoxScreen(): JSX.Element {
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!editId;

  const { user } = useAuth();
  const { currentHousehold } = useHousehold();
  const { isOnline } = useNetworkStatus();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [qrCode] = useState<string>(generateUUID());
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(isEditing);
  const [error, setError] = useState<string | null>(null);
  const [existingLocations, setExistingLocations] = useState<string[]>([]);

  // Load existing box if editing
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const { data, error: fetchErr } = await supabase
          .from('boxes')
          .select('*')
          .eq('id', editId)
          .single();
        if (fetchErr) throw fetchErr;
        const box = data as Box;
        setName(box.name);
        setDescription(box.description ?? '');
        setLocation(box.location ?? '');
        setPhotoUri(box.photo_url);
        setTags(box.tags ?? []);
      } catch (err) {
        console.error('[CreateBox] load edit:', err);
      } finally {
        setIsFetching(false);
      }
    })();
  }, [editId]);

  // Load existing locations for suggestions
  useEffect(() => {
    if (!currentHousehold) return;
    supabase
      .from('boxes')
      .select('location')
      .eq('household_id', currentHousehold.id)
      .neq('location', null)
      .then(({ data }) => {
        const locs = Array.from(
          new Set((data ?? []).map((r: { location: string | null }) => r.location).filter(Boolean))
        ) as string[];
        setExistingLocations(locs);
      });
  }, [currentHousehold]);

  const pickImage = async (source: 'camera' | 'library') => {
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
    }
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    Alert.alert('Add Photo', 'Choose a photo source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Photo Library', onPress: () => pickImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const addCustomTag = () => {
    const t = customTagInput.trim();
    if (t && !tags.includes(t)) {
      setTags((prev) => [...prev, t]);
    }
    setCustomTagInput('');
  };

  const toggleSuggestedTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const filename = `${user?.id}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadErr } = await supabase.storage
        .from('box-photos')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadErr) throw uploadErr;
      const { data } = supabase.storage.from('box-photos').getPublicUrl(filename);
      return data.publicUrl;
    } catch (err) {
      console.error('[CreateBox] uploadPhoto:', err);
      return null;
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Please enter a box name.'); return; }
    if (!currentHousehold || !user) { setError('No household selected.'); return; }
    setError(null);
    setIsLoading(true);
    try {
      let photoUrl: string | null = photoUri;

      // Upload photo if it's a local URI (not already uploaded)
      if (photoUri && !photoUri.startsWith('http') && isOnline) {
        photoUrl = await uploadPhoto(photoUri);
      }

      const boxData = {
        household_id: currentHousehold.id,
        created_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        photo_url: photoUrl,
        qr_code: isEditing ? undefined : qrCode,
        tags,
        is_archived: false,
      };

      if (isEditing && editId) {
        if (isOnline) {
          const { error: updateErr } = await supabase
            .from('boxes')
            .update(boxData)
            .eq('id', editId);
          if (updateErr) throw updateErr;
        } else {
          const cached = await getBoxes(currentHousehold.id);
          if (cached) {
            const updated = cached.map((b) =>
              b.id === editId ? { ...b, ...boxData } : b
            );
            await saveBoxes(currentHousehold.id, updated);
          }
          await enqueueSyncItem({
            id: generateUUID(),
            operation: 'update',
            entity: 'box',
            payload: { id: editId, ...boxData } as Box,
            created_at: new Date().toISOString(),
            retries: 0,
          });
        }
      } else {
        const newId = generateUUID();
        const fullBox: Box = {
          id: newId,
          ...boxData,
          qr_code: qrCode,
          description: boxData.description ?? null,
          location: boxData.location ?? null,
          photo_url: boxData.photo_url ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (isOnline) {
          const { error: insertErr } = await supabase.from('boxes').insert(fullBox);
          if (insertErr) throw insertErr;
        } else {
          const cached = (await getBoxes(currentHousehold.id)) ?? [];
          await saveBoxes(currentHousehold.id, [fullBox, ...cached]);
          await enqueueSyncItem({
            id: generateUUID(),
            operation: 'create',
            entity: 'box',
            payload: fullBox,
            created_at: new Date().toISOString(),
            retries: 0,
          });
        }
      }

      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save box.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Box' : 'New Box'}</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo picker */}
          <TouchableOpacity style={styles.photoPicker} onPress={showImagePicker} activeOpacity={0.85}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera-plus-outline" size={36} color="#9CA3AF" />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <View style={styles.section}>
            <TextInput
              label="Box name *"
              value={name}
              onChangeText={setName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.input}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.input}
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <TextInput
              label="Storage location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#0F1F3D"
              style={styles.input}
              left={<TextInput.Icon icon="map-marker-outline" />}
            />
            {existingLocations.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationSuggestions}>
                {existingLocations.filter((l) => l !== location).map((loc) => (
                  <TouchableOpacity
                    key={loc}
                    style={styles.locationChip}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={styles.locationChipText}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>

            {/* Custom tag input */}
            <View style={styles.customTagRow}>
              <RNTextInput
                style={styles.customTagInput}
                placeholder="Add custom tag..."
                placeholderTextColor="#9CA3AF"
                value={customTagInput}
                onChangeText={setCustomTagInput}
                onSubmitEditing={addCustomTag}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addTagBtn} onPress={addCustomTag}>
                <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Selected tags */}
            {tags.length > 0 && (
              <View style={styles.selectedTags}>
                <Text style={styles.subsectionLabel}>Selected</Text>
                <View style={styles.tagsWrap}>
                  {tags.map((tag) => (
                    <TagChip key={tag} label={tag} onRemove={() => setTags((p) => p.filter((t) => t !== tag))} />
                  ))}
                </View>
              </View>
            )}

            {/* Holiday suggestions */}
            <Text style={styles.subsectionLabel}>Holiday & Seasonal</Text>
            <View style={styles.tagsWrap}>
              {HOLIDAY_TAGS.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => toggleSuggestedTag(tag)}>
                  <TagChip label={tag} variant={tags.includes(tag) ? 'filled' : 'outlined'} />
                </TouchableOpacity>
              ))}
            </View>

            {/* General suggestions */}
            <Text style={[styles.subsectionLabel, styles.subsectionLabelSpaced]}>General</Text>
            <View style={styles.tagsWrap}>
              {GENERAL_TAGS.map((tag) => (
                <TouchableOpacity key={tag} onPress={() => toggleSuggestedTag(tag)}>
                  <TagChip label={tag} variant={tags.includes(tag) ? 'filled' : 'outlined'} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* QR Preview */}
          {!isEditing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QR Code Preview</Text>
              <View style={styles.qrPreview}>
                <QRCode value={qrCode} size={120} />
                <Text style={styles.qrHint}>This unique QR code will be saved with your box.</Text>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorBox}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
            contentStyle={styles.saveButtonContent}
            labelStyle={styles.saveButtonLabel}
            buttonColor="#0F1F3D"
          >
            {isEditing ? 'Save Changes' : 'Save Box'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  header: {
    backgroundColor: '#0F1F3D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  photoPicker: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  section: { marginBottom: 24 },
  input: { backgroundColor: '#FFFFFF' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F1F3D',
    marginBottom: 12,
  },
  subsectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  subsectionLabelSpaced: { marginTop: 14 },
  selectedTags: { marginBottom: 16 },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: -3,
    marginBottom: 4,
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F1F3D',
  },
  addTagBtn: {
    backgroundColor: '#0F1F3D',
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSuggestions: {
    marginTop: 8,
  },
  locationChip: {
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  locationChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  qrPreview: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  qrHint: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 13, flex: 1 },
  saveButton: { borderRadius: 14 },
  saveButtonContent: { paddingVertical: 6 },
  saveButtonLabel: { fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
