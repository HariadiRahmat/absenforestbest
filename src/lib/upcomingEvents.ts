/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_UPCOMING_EVENTS, UpcomingEvent, UpcomingEventsConfig } from '../types';
import { getTodayStr } from './dateUtils';

export function normalizeUpcomingEvents(raw: Record<string, unknown>): UpcomingEventsConfig {
  const eventsRaw = Array.isArray(raw.events) ? raw.events : [];
  const events: UpcomingEvent[] = eventsRaw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const title = typeof row.title === 'string' ? row.title.trim().slice(0, 100) : '';
      const tanggal = typeof row.tanggal === 'string' ? row.tanggal.trim().slice(0, 10) : '';
      if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return null;
      return {
        id: typeof row.id === 'string' && row.id ? row.id : `event_${index}_${Date.now()}`,
        title,
        tanggal,
        description: typeof row.description === 'string' ? row.description.trim().slice(0, 300) : undefined,
        lokasi: typeof row.lokasi === 'string' ? row.lokasi.trim().slice(0, 120) : undefined,
        waktu: typeof row.waktu === 'string' ? row.waktu.trim().slice(0, 30) : undefined,
        order: typeof row.order === 'number' ? row.order : index,
      };
    })
    .filter((item): item is UpcomingEvent => item !== null);

  return {
    events,
    updatedAt: raw.updatedAt,
  };
}

export function emptyUpcomingEventsConfig(): UpcomingEventsConfig {
  return { ...DEFAULT_UPCOMING_EVENTS, events: [] };
}

export function resolveUpcomingEvents(raw?: Record<string, unknown>): UpcomingEventsConfig {
  if (!raw) return emptyUpcomingEventsConfig();
  return normalizeUpcomingEvents(raw);
}

export function newUpcomingEvent(order: number): UpcomingEvent {
  return {
    id: `event_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    tanggal: '',
    description: '',
    lokasi: '',
    waktu: '',
    order,
  };
}

export function daysUntilEvent(eventDate: string, todayStr = getTodayStr()): number {
  const today = parseLocalDate(todayStr);
  const target = parseLocalDate(eventDate);
  const diffMs = target.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function filterUpcomingEvents(events: UpcomingEvent[], todayStr = getTodayStr()): UpcomingEvent[] {
  return events.filter((event) => event.tanggal >= todayStr);
}

export function sortUpcomingEvents(events: UpcomingEvent[]): UpcomingEvent[] {
  return [...events].sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    return a.order - b.order;
  });
}

export function getUpcomingEventsSorted(events: UpcomingEvent[], todayStr = getTodayStr()): UpcomingEvent[] {
  return sortUpcomingEvents(filterUpcomingEvents(events, todayStr));
}

export function formatEventDateShort(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

export function formatEventDateLong(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

export type EventProximityTier = 'today' | 'tomorrow' | 'week' | 'month' | 'later';

export interface EventProximityInfo {
  tier: EventProximityTier;
  daysLeft: number;
  label: string;
  badgeClass: string;
  iconBgClass: string;
  iconClass: string;
  accentClass: string;
}

export function getEventProximity(eventDate: string, todayStr = getTodayStr()): EventProximityInfo {
  const daysLeft = daysUntilEvent(eventDate, todayStr);

  if (daysLeft <= 0) {
    return {
      tier: 'today',
      daysLeft: 0,
      label: 'Hari ini',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      iconBgClass: 'bg-rose-100',
      iconClass: 'text-rose-600',
      accentClass: 'border-rose-200 bg-gradient-to-br from-rose-50 to-white',
    };
  }

  if (daysLeft === 1) {
    return {
      tier: 'tomorrow',
      daysLeft: 1,
      label: 'Besok',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
      iconBgClass: 'bg-orange-100',
      iconClass: 'text-orange-600',
      accentClass: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
    };
  }

  if (daysLeft <= 7) {
    return {
      tier: 'week',
      daysLeft,
      label: `${daysLeft} hari lagi`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
      iconBgClass: 'bg-amber-100',
      iconClass: 'text-amber-700',
      accentClass: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    };
  }

  if (daysLeft <= 30) {
    return {
      tier: 'month',
      daysLeft,
      label: `${daysLeft} hari lagi`,
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
      iconBgClass: 'bg-sky-100',
      iconClass: 'text-sky-600',
      accentClass: 'border-sky-200 bg-gradient-to-br from-sky-50 to-white',
    };
  }

  return {
    tier: 'later',
    daysLeft,
    label: `${daysLeft} hari lagi`,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    iconBgClass: 'bg-emerald-100',
    iconClass: 'text-emerald-600',
    accentClass: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
  };
}

export function getCountdownText(event: UpcomingEvent, todayStr = getTodayStr()): string {
  const proximity = getEventProximity(event.tanggal, todayStr);
  const dateLabel = formatEventDateShort(event.tanggal);

  if (proximity.tier === 'today') {
    return `Hari ini — ${event.title}`;
  }

  if (proximity.tier === 'tomorrow') {
    return `Besok menuju ${dateLabel}`;
  }

  return `${proximity.daysLeft} hari lagi menuju ${dateLabel}`;
}
