import AsyncStorage from '@react-native-async-storage/async-storage';
import { Box, Household, SyncQueueItem } from '../types';

const KEYS = {
  boxes: (householdId: string) => `@stashtag:boxes:${householdId}`,
  syncQueue: '@stashtag:syncQueue',
  currentHousehold: '@stashtag:currentHousehold',
};

// ---- Boxes ----

export async function saveBoxes(householdId: string, boxes: Box[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.boxes(householdId), JSON.stringify(boxes));
  } catch (error) {
    console.error('[storage] saveBoxes error:', error);
  }
}

export async function getBoxes(householdId: string): Promise<Box[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.boxes(householdId));
    if (!raw) return null;
    return JSON.parse(raw) as Box[];
  } catch (error) {
    console.error('[storage] getBoxes error:', error);
    return null;
  }
}

// ---- Sync Queue ----

export async function saveSyncQueue(items: SyncQueueItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.syncQueue, JSON.stringify(items));
  } catch (error) {
    console.error('[storage] saveSyncQueue error:', error);
  }
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.syncQueue);
    if (!raw) return [];
    return JSON.parse(raw) as SyncQueueItem[];
  } catch (error) {
    console.error('[storage] getSyncQueue error:', error);
    return [];
  }
}

export async function clearSyncQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.syncQueue);
  } catch (error) {
    console.error('[storage] clearSyncQueue error:', error);
  }
}

export async function enqueueSyncItem(item: SyncQueueItem): Promise<void> {
  const queue = await getSyncQueue();
  queue.push(item);
  await saveSyncQueue(queue);
}

export async function removeSyncItem(itemId: string): Promise<void> {
  const queue = await getSyncQueue();
  const filtered = queue.filter((i) => i.id !== itemId);
  await saveSyncQueue(filtered);
}

// ---- Current Household ----

export async function saveCurrentHousehold(household: Household): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.currentHousehold, JSON.stringify(household));
  } catch (error) {
    console.error('[storage] saveCurrentHousehold error:', error);
  }
}

export async function getCurrentHousehold(): Promise<Household | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.currentHousehold);
    if (!raw) return null;
    return JSON.parse(raw) as Household;
  } catch (error) {
    console.error('[storage] getCurrentHousehold error:', error);
    return null;
  }
}

export async function clearCurrentHousehold(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEYS.currentHousehold);
  } catch (error) {
    console.error('[storage] clearCurrentHousehold error:', error);
  }
}
