import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../../src/lib/supabase';
import { Box } from '../../../../src/types';

export default function QRManagementScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [box, setBox] = useState<Box | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [stickersModalVisible, setStickersModalVisible] = useState(false);

  const svgRef = useRef<{ toDataURL: (callback: (data: string) => void) => void } | null>(null);

  const fetchBox = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setBox(data as Box);
    } catch (err) {
      console.error('[QR] fetchBox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBox();
  }, [fetchBox]);

  const getQRDataUrl = (): Promise<string> =>
    new Promise((resolve, reject) => {
      if (!svgRef.current) {
        reject(new Error('QR ref not ready'));
        return;
      }
      svgRef.current.toDataURL((data: string) => resolve(data));
    });

  const buildLabelHtml = (qrBase64: string, boxName: string): string => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page { size: 2in 2in; margin: 0; }
        body {
          margin: 0; padding: 0;
          width: 2in; height: 2in;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          font-family: -apple-system, sans-serif;
          background: white;
        }
        img { width: 1.4in; height: 1.4in; display: block; margin-bottom: 4px; }
        .label { font-size: 9px; font-weight: bold; color: #0F1F3D; text-align: center; max-width: 1.8in; }
        .brand { font-size: 7px; color: #F5A623; font-weight: 800; letter-spacing: 1px; margin-top: 2px; }
      </style>
    </head>
    <body>
      <img src="data:image/png;base64,${qrBase64}" />
      <div class="label">${boxName}</div>
      <div class="brand">STASHTAG</div>
    </body>
    </html>
  `;

  const handlePrint = async () => {
    if (!box) return;
    setIsPrinting(true);
    try {
      const qrBase64 = await getQRDataUrl();
      const html = buildLabelHtml(qrBase64, box.name);
      const { uri } = await Print.printToFileAsync({ html, width: 144, height: 144 });
      await Print.printAsync({ uri });
    } catch (err) {
      Alert.alert('Print Error', 'Unable to print. Make sure a printer is connected.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    if (!box) return;
    setIsSharing(true);
    try {
      const qrBase64 = await getQRDataUrl();
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              margin: 0; padding: 32px 20px;
              font-family: -apple-system, sans-serif;
              text-align: center; background: white;
            }
            h2 { color: #0F1F3D; margin: 12px 0 4px; font-size: 20px; }
            p { color: #6B7280; font-size: 13px; margin: 4px 0; }
            img { width: 200px; height: 200px; display: block; margin: 0 auto; }
            .brand { color: #F5A623; font-weight: 800; font-size: 22px; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="brand">STASHTAG</div>
          <img src="data:image/png;base64,${qrBase64}" />
          <h2>${box.name}</h2>
          ${box.location ? `<p>📍 ${box.location}</p>` : ''}
          <p>Scan this QR code with StashTag to view box contents.</p>
        </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Share QR for ${box.name}` });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch (err) {
      Alert.alert('Share Error', 'Unable to share QR code.');
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      </SafeAreaView>
    );
  }

  if (!box) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Box not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qrValue = box.qr_code ?? box.id;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Code</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={styles.content}>
        {/* QR Display */}
        <View style={styles.qrCard}>
          <QRCode
            value={qrValue}
            size={220}
            getRef={(ref) => { (svgRef as React.MutableRefObject<typeof ref>).current = ref; }}
          />
          <Text style={styles.boxName}>{box.name}</Text>
          <Text style={styles.qrId} numberOfLines={1}>{qrValue}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, isPrinting && styles.actionBtnDisabled]}
            onPress={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#0F1F3D" />
            ) : (
              <MaterialCommunityIcons name="printer-outline" size={24} color="#0F1F3D" />
            )}
            <Text style={styles.actionBtnText}>Print QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, isSharing && styles.actionBtnDisabled]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#0F1F3D" />
            ) : (
              <MaterialCommunityIcons name="share-outline" size={24} color="#0F1F3D" />
            )}
            <Text style={styles.actionBtnText}>Share QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.stickerBtn]}
            onPress={() => setStickersModalVisible(true)}
          >
            <MaterialCommunityIcons name="sticker-outline" size={24} color="#F5A623" />
            <Text style={styles.stickerBtnText}>Buy Stickers</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stickers Modal */}
      <Modal
        visible={stickersModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStickersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalIconCircle}>
              <Text style={styles.modalIconEmoji}>🏷️</Text>
            </View>
            <Text style={styles.modalTitle}>Get Professional StashTag Stickers</Text>
            <Text style={styles.modalBody}>
              Order pre-printed waterproof QR stickers. 6 stickers per sheet for $4.99. Each sticker
              is pre-linked to a new box in your account — just peel, stick, and scan.
            </Text>
            <TouchableOpacity
              style={styles.orderButton}
              onPress={() => {
                setStickersModalVisible(false);
                Linking.openURL('https://stashtag.app/shop');
              }}
            >
              <Text style={styles.orderButtonText}>Order Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.laterButton}
              onPress={() => setStickersModalVisible(false)}
            >
              <Text style={styles.laterButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
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
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    marginBottom: 32,
    width: '100%',
  },
  boxName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1F3D',
    marginTop: 20,
    textAlign: 'center',
  },
  qrId: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    fontFamily: Platform?.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F1F3D',
  },
  stickerBtn: {
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
  },
  stickerBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F5A623',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundText: {
    fontSize: 16,
    color: '#6B7280',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 32,
    paddingBottom: 48,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalIconEmoji: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F1F3D',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  orderButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F1F3D',
  },
  laterButton: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
});
