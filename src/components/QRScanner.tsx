import React, { useState, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface QRScannerProps {
  visible: boolean;
  onScan: (value: string) => void;
  onClose: () => void;
}

export function QRScanner({ visible, onScan, onClose }: QRScannerProps): JSX.Element {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const scannedRef = useRef(false);

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScan(data);
  };

  const handleClose = () => {
    scannedRef.current = false;
    setTorchOn(false);
    onClose();
  };

  if (!visible) return <View />;

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Checking camera permissions...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="camera-off" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            StashTag needs camera access to scan QR codes on your boxes.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarCodeScanned}
        />

        {/* Dark overlay with square cutout */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.reticle}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <MaterialCommunityIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan QR Code</Text>
          <TouchableOpacity
            style={[styles.torchButton, torchOn && styles.torchButtonActive]}
            onPress={() => setTorchOn((v) => !v)}
          >
            <MaterialCommunityIcons
              name={torchOn ? 'flashlight' : 'flashlight-off'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {/* Hint text */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Point your camera at a StashTag QR code</Text>
        </View>
      </View>
    </Modal>
  );
}

const RETICLE_SIZE = 240;
const CORNER_SIZE = 24;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ?? 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  torchButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  torchButtonActive: {
    backgroundColor: '#F5A623',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: RETICLE_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: 'relative',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#F5A623',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F1F3D',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#0F1F3D',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontSize: 15,
  },
});
