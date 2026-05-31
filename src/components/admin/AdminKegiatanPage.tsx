import React from 'react';
import { UpcomingEventsSettings } from '../UpcomingEventsSettings';

export function AdminKegiatanPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="scout-card px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
          Manajemen Jadwal
        </p>
        <h1 className="text-lg sm:text-xl font-bold text-bento-text mt-1">Kegiatan Mendatang</h1>
        <p className="text-xs sm:text-sm text-bento-muted mt-1">
          Buat dan kelola jadwal kegiatan yang tampil di halaman Anggota dan Purna.
        </p>
      </header>

      <UpcomingEventsSettings />
    </div>
  );
}
