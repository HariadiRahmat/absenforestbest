import React from 'react';
import { LayoutDashboard, QrCode, UsersRound, CalendarDays } from 'lucide-react';

export type AdminPage = 'overview' | 'absensi' | 'kelola' | 'kegiatan';

interface AdminPageNavProps {
  active: AdminPage;
  onChange: (page: AdminPage) => void;
}

const pages: { key: AdminPage; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Beranda', icon: LayoutDashboard },
  { key: 'absensi', label: 'Absensi', icon: QrCode },
  { key: 'kelola', label: 'Kelola Anggota', icon: UsersRound },
  { key: 'kegiatan', label: 'Kegiatan', icon: CalendarDays },
];

export function AdminPageNav({ active, onChange }: AdminPageNavProps) {
  return (
    <nav className="scout-card p-1 mb-4 sm:mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
        {pages.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            id={`admin-page-${key}`}
            type="button"
            onClick={() => onChange(key)}
            className={`scout-nav-pill justify-center min-w-0 ${
              active === key ? 'scout-nav-pill-active' : 'scout-nav-pill-inactive'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate text-[11px] sm:text-sm">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
