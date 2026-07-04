import { DeviceView } from '../devices/devices.types';
import { AlertView } from '../alerts/alerts.types';
import { UsageSnapshot } from '../usage/usage.types';

/** Internal domain event names. */
export const DOMAIN_EVENTS = {
  DEVICE_UPDATED: 'device.updated',
  USAGE_UPDATED: 'usage.updated',
  ALERT_TRIGGERED: 'alert.triggered',
  ALERT_RESOLVED: 'alert.resolved',
  OFFICE_HOURS_UPDATED: 'office-hours.updated',
} as const;

export interface OfficeHoursState {
  mode: 'auto' | 'open' | 'closed';
  withinOfficeHours: boolean;
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface OfficeHoursUpdatedEvent {
  state: OfficeHoursState;
}

export interface DeviceUpdatedEvent {
  device: DeviceView;
  previousStatus: 'on' | 'off';
  source: 'simulator' | 'manual' | 'system';
}

export interface UsageUpdatedEvent {
  usage: UsageSnapshot;
}

export interface AlertTriggeredEvent {
  alert: AlertView;
}

export interface AlertResolvedEvent {
  alert: AlertView;
}
