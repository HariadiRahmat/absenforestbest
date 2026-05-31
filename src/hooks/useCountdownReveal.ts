/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';

const COUNTDOWN_START = 100;
const COUNTDOWN_DURATION_MS = 1800;

function getCountdownStart(target: number): number {
  return Math.max(COUNTDOWN_START, target + 21);
}

/** Animate day count down from a higher number to the target on first mount. */
export function useCountdownReveal(targetDays: number, enabled: boolean): number {
  const [display, setDisplay] = useState(() =>
    enabled ? getCountdownStart(targetDays) : targetDays
  );
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasAnimatedRef.current) {
      setDisplay(targetDays);
      return;
    }

    const start = getCountdownStart(targetDays);
    if (start <= targetDays) {
      setDisplay(targetDays);
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(targetDays);
      return;
    }

    hasAnimatedRef.current = true;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / COUNTDOWN_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      const value = Math.round(start - (start - targetDays) * eased);
      setDisplay(value);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setDisplay(targetDays);
      }
    };

    setDisplay(start);
    rafId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafId);
  }, [targetDays, enabled]);

  return display;
}
