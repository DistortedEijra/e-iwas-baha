import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppStore } from '../store/index.ts';
import { sendNotification, requestNotificationPermission } from '../lib/notify.ts';
import type { SegmentUpdate } from '../types.ts';

export function useRealtime(onFloodUpdate?: () => void) {
  const applySegmentUpdate = useAppStore((s) => s.applySegmentUpdate);
  const addAlert = useAppStore((s) => s.addAlert);
  const triggerReroute = useAppStore((s) => s.triggerReroute);
  const setRerouting = useAppStore((s) => s.setRerouting);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    requestNotificationPermission();

    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => console.log('[ws] connected'));
    socket.on('disconnect', () => console.log('[ws] disconnected'));

    socket.on('segment:updated', async (update: SegmentUpdate) => {
      applySegmentUpdate(update);

      // Always refresh the global flood overlay
      onFloodUpdate?.();

      const { routeResult } = useAppStore.getState();
      const isOnRoute = routeResult?.route?.features.some(
        (f) => f.properties.segmentId === update.segmentId,
      );

      if (!isOnRoute) return;

      const inAppMsg = update.passable
        ? 'Flood level changed on your route — recalculating.'
        : 'A road on your route is now impassable! Recalculating…';
      const severity = update.passable ? 'warning' : 'danger';

      addAlert(inAppMsg, severity);
      await sendNotification('E-Iwas Baha', inAppMsg);

      setRerouting(true);
      triggerReroute();
    });

    return () => { socket.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
