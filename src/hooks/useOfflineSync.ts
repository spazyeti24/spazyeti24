import { useEffect, useRef } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { getSyncQueue, saveSyncQueue } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { SyncQueueItem, Box, Tag } from '../types';

const MAX_RETRIES = 3;

async function processQueueItem(item: SyncQueueItem): Promise<boolean> {
  try {
    if (item.entity === 'box') {
      if (item.operation === 'create') {
        const payload = item.payload as Box;
        const { error } = await supabase.from('boxes').insert({
          id: payload.id,
          household_id: payload.household_id,
          created_by: payload.created_by,
          name: payload.name,
          description: payload.description,
          location: payload.location,
          photo_url: payload.photo_url,
          qr_code: payload.qr_code,
          tags: payload.tags,
          is_archived: payload.is_archived,
        });
        if (error) throw error;
      } else if (item.operation === 'update') {
        const payload = item.payload as Box;
        const { error } = await supabase
          .from('boxes')
          .update({
            name: payload.name,
            description: payload.description,
            location: payload.location,
            photo_url: payload.photo_url,
            tags: payload.tags,
            is_archived: payload.is_archived,
          })
          .eq('id', payload.id);
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const payload = item.payload as { id: string };
        const { error } = await supabase.from('boxes').delete().eq('id', payload.id);
        if (error) throw error;
      }
    } else if (item.entity === 'tag') {
      if (item.operation === 'create') {
        const payload = item.payload as Tag;
        const { error } = await supabase.from('tags').insert({
          id: payload.id,
          household_id: payload.household_id,
          label: payload.label,
          created_by: payload.created_by,
        });
        if (error) throw error;
      } else if (item.operation === 'delete') {
        const payload = item.payload as { id: string };
        const { error } = await supabase.from('tags').delete().eq('id', payload.id);
        if (error) throw error;
      }
    }
    return true;
  } catch (err) {
    console.error('[useOfflineSync] Failed to process item:', item.id, err);
    return false;
  }
}

export function useOfflineSync(): void {
  const { isOnline } = useNetworkStatus();
  const isSyncing = useRef<boolean>(false);
  const wasOffline = useRef<boolean>(false);

  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      return;
    }

    // Only sync when transitioning from offline → online
    if (!wasOffline.current) return;
    wasOffline.current = false;

    if (isSyncing.current) return;

    const runSync = async () => {
      isSyncing.current = true;
      try {
        const queue = await getSyncQueue();
        if (queue.length === 0) return;

        const remaining: SyncQueueItem[] = [];

        for (const item of queue) {
          const success = await processQueueItem(item);
          if (!success) {
            const updatedItem: SyncQueueItem = {
              ...item,
              retries: item.retries + 1,
            };
            if (updatedItem.retries < MAX_RETRIES) {
              remaining.push(updatedItem);
            } else {
              console.warn('[useOfflineSync] Dropping item after max retries:', item.id);
            }
          }
          // Successfully processed items are not added to remaining
        }

        await saveSyncQueue(remaining);
      } catch (err) {
        console.error('[useOfflineSync] Sync run error:', err);
      } finally {
        isSyncing.current = false;
      }
    };

    runSync();
  }, [isOnline]);
}
