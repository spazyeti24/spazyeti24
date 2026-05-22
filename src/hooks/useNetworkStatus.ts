import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isOnline: boolean;
  isLoading: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch initial network state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
      setIsLoading(false);
    });

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, isLoading };
}
