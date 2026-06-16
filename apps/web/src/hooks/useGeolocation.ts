import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAppStore } from '../store/index.ts';

export function useGeolocation() {
  const setPosition = useAppStore((s) => s.setPosition);
  const setError = useAppStore((s) => s.setPositionError);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      useNativeGeolocation(setPosition, setError);
    } else {
      return useBrowserGeolocation(setPosition, setError);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function useBrowserGeolocation(
  setPosition: (p: { lat: number; lng: number }) => void,
  setError: (e: string) => void,
): () => void {
  if (!('geolocation' in navigator)) {
    setError('Geolocation is not supported by this browser.');
    return () => {};
  }

  const id = navigator.geolocation.watchPosition(
    (pos) => {
      // Don't override a position the user manually set via map click/drag
      if (useAppStore.getState().isManualPosition) return;
      setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    },
    (err) => {
      if (!useAppStore.getState().isManualPosition) setError(err.message);
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 },
  );

  return () => navigator.geolocation.clearWatch(id);
}

async function useNativeGeolocation(
  setPosition: (p: { lat: number; lng: number }) => void,
  setError: (e: string) => void,
): Promise<void> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation');

    const perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted') {
      await Geolocation.requestPermissions({ permissions: ['location'] });
    }

    await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10_000 },
      (pos, err) => {
        if (err) { setError(String(err)); return; }
        if (pos) setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
    );
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Native geolocation failed');
  }
}
