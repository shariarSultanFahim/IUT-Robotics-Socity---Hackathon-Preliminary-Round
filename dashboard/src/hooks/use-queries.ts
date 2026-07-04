'use client';

import { useQuery } from '@tanstack/react-query';
import { dataApi } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/components/providers/auth-provider';

function useReady() {
  const { user, initializing } = useAuth();
  return !initializing && !!user;
}

export function useDevices() {
  return useQuery({
    queryKey: queryKeys.devices,
    queryFn: dataApi.devices,
    enabled: useReady(),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: queryKeys.usage,
    queryFn: dataApi.usage,
    enabled: useReady(),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: dataApi.alerts,
    enabled: useReady(),
  });
}

export function useOfficeHours() {
  return useQuery({
    queryKey: queryKeys.officeHours,
    queryFn: dataApi.officeHours,
    enabled: useReady(),
  });
}
