/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  Trash2,
  Loader2,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { defaultKelasReguForRole } from '../lib/memberApproval';
import {
  ensurePreRegisteredForApprovedApplication,
  listApprovedAwaitingActivation,
} from '../lib/registrationActivation';
import { MemberRegistration, PurnaApprovalStatus, UserProfile, UserRole } from '../types';
import { Alert } from './ui/Alert';

interface PurnaApplicationsPanelProps {
  applications: MemberRegistration[];
  users: UserProfile[];
  loading: boolean;
}

export function PurnaApplicationsPanel({ applications, users, loading }: PurnaApplicationsPanelProps) {
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleByEmail, setRoleByEmail] = useState<Record<string, UserRole>>({});
  const [kelasByEmail, setKelasByEmail] = useState<Record<string, string>>({});
  const [reguByEmail, setReguByEmail] = useState<Record<string, string>>({});

  const getRole = (app: MemberRegistration) => roleByEmail[app.email] ?? UserRole.ANGGOTA;
  const getKelas = (app: MemberRegistration) => {
    const role = getRole(app);
    const defaults = defaultKelasReguForRole(role, app);
    return kelasByEmail[app.email] ?? defaults.kelas;
  };
  const getRegu = (app: MemberRegistration) => {
    const role = getRole(app);
    const defaults = defaultKelasReguForRole(role, app);
    return reguByEmail[app.email] ?? defaults.regu;
  };

  const handleRoleChange = (app: MemberRegistration, role: UserRole) => {
    setRoleByEmail((prev) => ({ ...prev, [app.email]: role }));
    const defaults = defaultKelasReguForRole(role, app);
    setKelasByEmail((prev) => ({ ...prev, [app.email]: defaults.kelas }));
    setReguByEmail((prev) => ({ ...prev, [app.email]: defaults.regu }));
  };

  const handleApprove = async (app: MemberRegistration) => {
    const role = getRole(app);
    const kelas = getKelas(app).trim();
    const regu = getRegu(app).trim();

    if (role === UserRole.ANGGOTA && (!kelas || kelas === '-' || !regu || regu === '-')) {
      setError('Isi kelas dan regu untuk Anggota sebelum menyetujui.');
      return;
    }

    setProcessingEmail(app.email);
    setError(null);
    try {
      const emailKey = app.email.toLowerCase();

      await updateDoc(doc(db, 'purna_registrations', emailKey), {
        approvalStatus: PurnaApprovalStatus.APPROVED,
        approvedRole: role,
        reviewedAt: serverTimestamp(),
      });

      await ensurePreRegisteredForApprovedApplication({
        ...app,
        approvalStatus: PurnaApprovalStatus.APPROVED,
        approvedRole: role,
        kelas,
        regu,
      });
    } catch (err) {
      console.error(err);
      setError('Gagal menyetujui pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleReject = async (app: MemberRegistration) => {
    if (!window.confirm(`Tolak pendaftaran ${app.nama} (${app.email})?`)) return;
    setProcessingEmail(app.email);
    setError(null);
    try {
      await updateDoc(doc(db, 'purna_registrations', app.email), {
        approvalStatus: PurnaApprovalStatus.REJECTED,
        reviewedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError('Gagal menolak pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleDelete = async (app: MemberRegistration) => {
    if (!window.confirm(`Hapus arsip pendaftaran ${app.email}?`)) return;
    setProcessingEmail(app.email);
    try {
      await deleteDoc(doc(db, 'purna_registrations', app.email));
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleActivate = async (app: MemberRegistration) => {
    setProcessingEmail(app.email);
    setError(null);
    try {
      await ensurePreRegisteredForApprovedApplication(app);
    } catch (err) {
      console.error(err);
      setError('Gagal menyiapkan aktivasi akun. Coba lagi atau periksa Firestore rules.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const pending = applications.filter((a) => a.approvalStatus === PurnaApprovalStatus.PENDING);
  const rejected = applications.filter((a) => a.approvalStatus === PurnaApprovalStatus.REJECTED);
  const approvedAwaiting = listApprovedAwaitingActivation(applications, users);
  const reviewItems = [...pending, ...rejected, ...approvedAwaiting];

  return (
    <div className="scout-card p-4 sm:p-6">
      <div className="scout-section-head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-bento-dark" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-bento-text">Tinjau Pendaftaran</h3>
            <p className="text-xs sm:text-sm text-bento-muted mt-0.5 leading-relaxed">
              Validasi pendaftar baru. Tentukan role Anggota, Pembina, atau Purna sebelum disetujui.
            </p>
          </div>
        </div>
        {pending.length > 0 && <span className="scout-count-badge">{pending.length}</span>}
        {pending.length === 0 && approvedAwaiting.length > 0 && (
          <span className="scout-count-badge">{approvedAwaiting.length}</span>
        )}
      </div>

      {error && <Alert variant="error" title="Perhatian" message={error} className="mb-4" onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-10 text-bento-muted text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Memuat pendaftaran...
        </div>
      ) : reviewItems.length === 0 ? (
        <div className="text-center py-10 text-bento-muted text-sm">
          <UserPlus className="w-10 h-10 stroke-1 mx-auto mb-3 opacity-30" />
          Tidak ada pendaftaran yang perlu ditinjau.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-3">
                Menunggu Konfirmasi ({pending.length})
              </h4>
              <div className="space-y-3">
                {pending.map((app) => (
                  <ApplicationCard
                    key={app.email}
                    app={app}
                    role={getRole(app)}
                    kelas={getKelas(app)}
                    regu={getRegu(app)}
                    processing={processingEmail === app.email}
                    onRoleChange={(role) => handleRoleChange(app, role)}
                    onKelasChange={(v) => setKelasByEmail((prev) => ({ ...prev, [app.email]: v }))}
                    onReguChange={(v) => setReguByEmail((prev) => ({ ...prev, [app.email]: v }))}
                    onApprove={() => handleApprove(app)}
                    onReject={() => handleReject(app)}
                  />
                ))}
              </div>
            </section>
          )}

          {approvedAwaiting.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-3">
                Disetujui — Menunggu Aktivasi ({approvedAwaiting.length})
              </h4>
              <p className="text-xs text-bento-muted mb-3 leading-relaxed">
                Akun sudah disetujui tapi belum aktif login. Tekan &quot;Siapkan Aktivasi&quot; jika pengguna stuck di halaman persetujuan.
              </p>
              <div className="space-y-3">
                {approvedAwaiting.map((app) => (
                  <ApplicationCard
                    key={app.email}
                    app={app}
                    role={app.approvedRole ?? UserRole.ANGGOTA}
                    kelas={app.kelas ?? '-'}
                    regu={app.regu ?? '-'}
                    processing={processingEmail === app.email}
                    onRoleChange={() => {}}
                    onKelasChange={() => {}}
                    onReguChange={() => {}}
                    onActivate={() => handleActivate(app)}
                    awaitingActivation
                  />
                ))}
              </div>
            </section>
          )}

          {rejected.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-3">
                Ditolak ({rejected.length})
              </h4>
              <div className="space-y-3">
                {rejected.map((app) => (
                  <ApplicationCard
                    key={app.email}
                    app={app}
                    role={UserRole.ANGGOTA}
                    kelas={app.kelas ?? '-'}
                    regu={app.regu ?? '-'}
                    processing={processingEmail === app.email}
                    onRoleChange={() => {}}
                    onKelasChange={() => {}}
                    onReguChange={() => {}}
                    onDelete={() => handleDelete(app)}
                    readonly
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  role,
  kelas,
  regu,
  processing,
  onRoleChange,
  onKelasChange,
  onReguChange,
  onApprove,
  onReject,
  onDelete,
  onActivate,
  readonly,
  awaitingActivation,
}: {
  app: MemberRegistration;
  role: UserRole;
  kelas: string;
  regu: string;
  processing: boolean;
  onRoleChange: (role: UserRole) => void;
  onKelasChange: (v: string) => void;
  onReguChange: (v: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  onActivate?: () => void;
  readonly?: boolean;
  awaitingActivation?: boolean;
}) {
  const hasBiodata = Boolean(app.tanggalLahir || app.alamat || app.pendidikanSd);
  const statusBadge =
    awaitingActivation ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-lime-50 text-lime-800 border border-lime-200">
        <CheckCircle className="w-3 h-3" /> Menunggu login
      </span>
    ) : app.approvalStatus === PurnaApprovalStatus.REJECTED ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-100">
        <XCircle className="w-3 h-3" /> Ditolak
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );

  return (
    <div className="scout-member-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-bento-text truncate">{app.nama}</p>
          <p className="text-[11px] text-bento-muted flex items-center gap-1 mt-0.5 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            {app.email}
          </p>
        </div>
        {statusBadge}
      </div>

      {(app.kelas || app.regu) && (
        <p className="text-[11px] text-bento-muted">
          Pengajuan: {app.kelas || '—'} · {app.regu || '—'}
        </p>
      )}

      {hasBiodata && (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-bento-muted">
            {app.tanggalLahir && <span>Lahir: {app.tanggalLahir}</span>}
            {(app.agama || app.statusPerkawinan) && (
              <span>{[app.agama, app.statusPerkawinan].filter(Boolean).join(' · ')}</span>
            )}
            {app.alamat && (
              <span className="col-span-2 flex items-start gap-1">
                <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{app.alamat}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {app.pendidikanSd && <span className="scout-chip">SD: {app.pendidikanSd}</span>}
            {app.pendidikanSmp && <span className="scout-chip">SMP: {app.pendidikanSmp}</span>}
            {app.pendidikanSma && <span className="scout-chip">SMA: {app.pendidikanSma}</span>}
            {app.pendidikanKuliah && <span className="scout-chip">Kuliah: {app.pendidikanKuliah}</span>}
          </div>
        </>
      )}

      {!readonly && onApprove && onReject && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-bento-border">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Role</label>
              <select className="scout-select text-xs" value={role} onChange={(e) => onRoleChange(e.target.value as UserRole)}>
                <option value={UserRole.ANGGOTA}>Anggota</option>
                <option value={UserRole.ADMIN}>Pembina</option>
                <option value={UserRole.PURNA}>Purna</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Kelas</label>
              <input className="scout-input text-xs py-2" value={kelas} onChange={(e) => onKelasChange(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Regu</label>
              <input className="scout-input text-xs py-2" value={regu} onChange={(e) => onReguChange(e.target.value)} />
            </div>
          </div>
          <div className="scout-action-row">
            <button type="button" onClick={onApprove} disabled={processing} className="scout-action-btn text-lime-800 bg-lime-50 border-lime-200">
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Setujui
            </button>
            <button type="button" onClick={onReject} disabled={processing} className="scout-action-btn scout-action-btn-danger">
              <XCircle className="w-3.5 h-3.5" />
              Tolak
            </button>
          </div>
        </>
      )}

      {awaitingActivation && onActivate && (
        <button type="button" onClick={onActivate} disabled={processing} className="w-full scout-btn-primary text-xs py-2.5">
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Siapkan Aktivasi
        </button>
      )}

      {readonly && onDelete && (
        <button type="button" onClick={onDelete} disabled={processing} className="w-full scout-btn-secondary text-xs py-2">
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Arsip
        </button>
      )}
    </div>
  );
}
