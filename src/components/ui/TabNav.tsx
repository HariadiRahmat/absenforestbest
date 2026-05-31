/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabItem<T extends string> {
  id: string;
  key: T;
  label: string;
  icon: LucideIcon;
}

interface TabNavProps<T extends string> {
  tabs: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  columns?: 2 | 3 | 4 | 5;
}

export function TabNav<T extends string>({ tabs, active, onChange, columns = 3 }: TabNavProps<T>) {
  const useScrollStrip = columns >= 4;

  if (useScrollStrip) {
    return (
      <div className="scout-card p-1 mb-4 sm:mb-6 overflow-hidden">
        <div className="scout-tab-strip sm:flex sm:flex-wrap sm:overflow-visible">
          {tabs.map(({ id, key, label, icon: Icon }) => (
            <button
              key={key}
              id={id}
              type="button"
              onClick={() => onChange(key)}
              className={`scout-nav-pill justify-center min-w-0 sm:flex-1 ${
                active === key ? 'scout-nav-pill-active' : 'scout-nav-pill-inactive'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
  };
  const gridClass = gridCols[columns] ?? 'grid-cols-3';

  return (
    <div className={`scout-card p-1 grid ${gridClass} sm:flex sm:flex-wrap gap-1 mb-4 sm:mb-6`}>
      {tabs.map(({ id, key, label, icon: Icon }) => (
        <button
          key={key}
          id={id}
          type="button"
          onClick={() => onChange(key)}
          className={`scout-nav-pill w-full sm:flex-1 justify-center min-w-0 ${
            active === key ? 'scout-nav-pill-active' : 'scout-nav-pill-inactive'
          }`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </div>
  );
}
