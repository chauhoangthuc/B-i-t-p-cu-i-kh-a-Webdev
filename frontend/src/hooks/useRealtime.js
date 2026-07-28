import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function useRealtime(currentTripId, onUpdate, triggerToast) {
  useEffect(() => {
    if (!currentTripId) return;

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(socketUrl);

    socket.on('connect', () => {
      console.log('WebSocket connected to Jobs Service.');
    });

    socket.on('db_update', (payload) => {
      // Refresh events or expenses if relevant
      if (payload.data?.trip_id === currentTripId) {
        if (onUpdate) onUpdate(payload);
        if (triggerToast) {
          triggerToast(`Dữ liệu bảng ${payload.table} vừa thay đổi (${payload.action})`);
        }
      }
    });

    socket.on('weather_alert', (data) => {
      if (triggerToast) {
        triggerToast(`[Thời tiết] ${data.message}`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentTripId, onUpdate, triggerToast]);
}
