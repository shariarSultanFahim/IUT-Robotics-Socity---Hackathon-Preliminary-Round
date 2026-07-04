'use client';

import * as React from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-provider';
import { getAccessToken } from '@/lib/axios';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:3001';

interface SocketContextValue {
  connected: boolean;
}
const SocketContext = React.createContext<SocketContextValue>({
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth();
  const queryClient = useQueryClient();
  const [connected, setConnected] = React.useState(false);
  const socketRef = React.useRef<Socket | null>(null);

  React.useEffect(() => {
    // Only connect once authentication has resolved to a real user.
    if (initializing || !user) return;
    // Guard against duplicate connections (React Strict Mode).
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: getAccessToken() },
    });
    socketRef.current = socket;

    const invalidate = (key: string) =>
      queryClient.invalidateQueries({ queryKey: [key] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    // Refresh the handshake token on every reconnect attempt.
    socket.io.on('reconnect_attempt', () => {
      socket.auth = { token: getAccessToken() };
    });

    socket.on('device:update', () => {
      invalidate('devices');
      invalidate('usage');
    });
    socket.on('usage:update', () => invalidate('usage'));
    socket.on('alert:new', () => invalidate('alerts'));
    socket.on('alert:resolved', () => invalidate('alerts'));
    socket.on('office-hours:update', () => invalidate('office-hours'));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user, initializing, queryClient]);

  return (
    <SocketContext.Provider value={{ connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  return React.useContext(SocketContext);
}
