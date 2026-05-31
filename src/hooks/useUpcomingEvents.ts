/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, UpcomingEvent } from '../types';
import { getUpcomingEventsSorted, resolveUpcomingEvents } from '../lib/upcomingEvents';
import { getTodayStr } from '../lib/dateUtils';

export function useUpcomingEvents() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'settings', 'upcoming_events');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const config = snap.exists()
          ? resolveUpcomingEvents(snap.data() as Record<string, unknown>)
          : resolveUpcomingEvents();
        setEvents(getUpcomingEventsSorted(config.events, getTodayStr()));
        setLoading(false);
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/upcoming_events');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { events, loading };
}
