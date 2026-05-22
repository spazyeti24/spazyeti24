import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useHousehold } from '../../contexts/HouseholdContext';
import { Household } from '../../types';

export function HouseholdSwitcher(): JSX.Element | null {
  const { households, currentHousehold, setCurrentHousehold } = useHousehold();
  const [modalVisible, setModalVisible] = useState(false);

  if (households.length <= 1) return null;

  const handleSelect = async (h: Household) => {
    await setCurrentHousehold(h);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.triggerText} numberOfLines={1}>
          {currentHousehold?.name ?? 'Select Household'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color="#F5A623" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Switch Household</Text>
            <FlatList
              data={households}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isActive = item.id === currentHousehold?.id;
                return (
                  <TouchableOpacity
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => handleSelect(item)}
                  >
                    <MaterialCommunityIcons
                      name="home-outline"
                      size={18}
                      color={isActive ? '#F5A623' : '#6B7280'}
                      style={styles.itemIcon}
                    />
                    <Text style={[styles.itemText, isActive && styles.itemTextActive]}>
                      {item.name}
                    </Text>
                    {isActive && (
                      <MaterialCommunityIcons name="check" size={18} color="#F5A623" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    maxWidth: 160,
    gap: 4,
  },
  triggerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: 400,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F1F3D',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemActive: {
    backgroundColor: '#FFF8EF',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  itemTextActive: {
    color: '#0F1F3D',
    fontWeight: '700',
  },
});
