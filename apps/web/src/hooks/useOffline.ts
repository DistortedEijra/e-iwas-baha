import { useEffect } from 'react';
import { useAppStore } from '../store/index.ts';

export function useOffline() {
  const setOffline = useAppStore((s) => s.setOffline);

  useEffect(() => {
    setOffline(!navigator.onLine);

    const onOnline = () => {
      setOffline(false);
      // Bump rerouteAt so useRoute re-fetches as soon as connection is back
      useAppStore.getState().triggerReroute();
    };
    const onOffline = () => setOffline(true);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
