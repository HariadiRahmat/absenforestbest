/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Calendar,
  CalendarClock,
  Clock,
  MapPin,
  PartyPopper,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import { UpcomingEvent } from '../types';
import {
  formatEventDateLong,
  formatEventDateShort,
  getEventProximity,
  getUpcomingEventsSorted,
} from '../lib/upcomingEvents';
import { getTodayStr } from '../lib/dateUtils';
import { useUpcomingEvents } from '../hooks/useUpcomingEvents';
import { useCountdownReveal } from '../hooks/useCountdownReveal';

function proximityIcon(tier: ReturnType<typeof getEventProximity>['tier']) {
  switch (tier) {
    case 'today':
      return Zap;
    case 'tomorrow':
      return PartyPopper;
    case 'week':
      return Timer;
    case 'month':
      return CalendarClock;
    default:
      return Calendar;
  }
}

interface UpcomingEventsPanelProps {
  compact?: boolean;
}

export function UpcomingEventsPanel({ compact = false }: UpcomingEventsPanelProps) {
  const { events, loading } = useUpcomingEvents();
  const todayStr = getTodayStr();
  const sorted = getUpcomingEventsSorted(events, todayStr);
  const featured = sorted[0];
  const rest = sorted.slice(1);

  if (loading) {
    return (
      <div className="scout-card p-5 sm:p-6">
        <div className="text-center py-8 text-bento-muted text-sm">
          <div className="w-7 h-7 border-2 border-bento-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Memuat kegiatan mendatang...
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="scout-card p-5 sm:p-6">
        <div className="scout-section-head mb-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-bento-highlight flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-bento-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-bento-text">Kegiatan Mendatang</h3>
              <p className="text-xs sm:text-sm text-bento-muted mt-0.5">Belum ada jadwal kegiatan.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {featured && (
        <FeaturedEventCard event={featured} todayStr={todayStr} compact={compact} />
      )}

      {rest.length > 0 && (
        <div className="scout-card p-4 sm:p-5">
          <div className="scout-section-head mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-bento-primary shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-bento-text">Kegiatan Lainnya</h3>
            </div>
            <span className="scout-count-badge">{rest.length}</span>
          </div>

          <div className="space-y-2.5">
            {rest.map((event) => (
              <EventListItem key={event.id} event={event} todayStr={todayStr} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FeaturedEventCard({
  event,
  todayStr,
  compact,
}: {
  event: UpcomingEvent;
  todayStr: string;
  compact?: boolean;
}) {
  const proximity = getEventProximity(event.tanggal, todayStr);
  const Icon = proximityIcon(proximity.tier);
  const dateLabel = formatEventDateShort(event.tanggal);
  const shouldAnimateCountdown = proximity.daysLeft >= 2;
  const animatedDays = useCountdownReveal(proximity.daysLeft, shouldAnimateCountdown);
  const isAnimating = shouldAnimateCountdown && animatedDays !== proximity.daysLeft;

  const badgeLabel =
    proximity.tier === 'today'
      ? 'Hari ini'
      : proximity.tier === 'tomorrow'
        ? 'Besok'
        : `${animatedDays} hari lagi`;

  const headline =
    proximity.tier === 'today'
      ? `Hari ini — ${event.title}`
      : proximity.tier === 'tomorrow'
        ? `Besok menuju ${dateLabel}`
        : (
          <>
            <span className={`tabular-nums ${isAnimating ? 'inline-block transition-transform' : ''}`}>
              {animatedDays}
            </span>
            {' '}hari lagi menuju {dateLabel}
          </>
        );

  return (
    <div className={`scout-card border-2 overflow-hidden ${proximity.accentClass}`}>
      <div className={`p-4 sm:p-6 ${compact ? 'sm:p-5' : ''}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${proximity.iconBgClass}`}>
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${proximity.iconClass}`} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">
                Kegiatan Terdekat
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${proximity.badgeClass}`}>
                {proximity.tier === 'today' || proximity.tier === 'tomorrow' ? (
                  badgeLabel
                ) : (
                  <>
                    <span className="tabular-nums">{animatedDays}</span>
                    {' '}hari lagi
                  </>
                )}
              </span>
            </div>

            <p className="text-lg sm:text-xl font-bold text-bento-text leading-snug">
              {headline}
            </p>

            {proximity.tier !== 'today' && (
              <h4 className="text-sm sm:text-base font-semibold text-bento-text mt-2">
                {event.title}
              </h4>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs sm:text-sm text-bento-muted">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {formatEventDateLong(event.tanggal)}
              </span>
              {event.waktu && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {event.waktu}
                </span>
              )}
              {event.lokasi && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {event.lokasi}
                </span>
              )}
            </div>

            {event.description && (
              <p className="text-xs sm:text-sm text-bento-muted mt-3 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EventListItem({ event, todayStr }: { event: UpcomingEvent; todayStr: string }) {
  const proximity = getEventProximity(event.tanggal, todayStr);
  const Icon = proximityIcon(proximity.tier);

  return (
    <div className="scout-member-card flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${proximity.iconBgClass}`}>
        <Icon className={`w-4 h-4 ${proximity.iconClass}`} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-bento-text truncate">{event.title}</p>
            <p className="text-xs text-bento-muted mt-0.5">
              {formatEventDateShort(event.tanggal)}
              {event.waktu ? ` · ${event.waktu}` : ''}
            </p>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${proximity.badgeClass}`}>
            {proximity.label}
          </span>
        </div>

        {(event.lokasi || event.description) && (
          <div className="mt-2 space-y-0.5">
            {event.lokasi && (
              <p className="text-[11px] text-bento-muted flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                {event.lokasi}
              </p>
            )}
            {event.description && (
              <p className="text-[11px] text-bento-muted line-clamp-1">{event.description}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
