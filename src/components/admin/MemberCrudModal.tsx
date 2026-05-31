import React from 'react';
import { Check, X } from 'lucide-react';
import { UserRole, UserStatus } from '../../types';

interface MemberCrudModalProps {
  isEditMode: boolean;
  formContextRole: UserRole;
  formName: string;
  formEmail: string;
  formClass: string;
  formSquad: string;
  formStatus: UserStatus;
  formRole: UserRole;
  formError: string | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFormNameChange: (value: string) => void;
  onFormEmailChange: (value: string) => void;
  onFormClassChange: (value: string) => void;
  onFormSquadChange: (value: string) => void;
  onFormStatusChange: (value: UserStatus) => void;
}

export function MemberCrudModal({
  isEditMode,
  formContextRole,
  formName,
  formEmail,
  formClass,
  formSquad,
  formStatus,
  formRole,
  formError,
  onClose,
  onSubmit,
  onFormNameChange,
  onFormEmailChange,
  onFormClassChange,
  onFormSquadChange,
  onFormStatusChange,
}: MemberCrudModalProps) {
  const title = isEditMode
    ? formContextRole === UserRole.ADMIN
      ? 'Ubah Data Pembina'
      : formContextRole === UserRole.PURNA
        ? 'Ubah Data Purna'
        : 'Ubah Data Anggota'
    : formContextRole === UserRole.ADMIN
      ? 'Pre-Register Pembina Baru'
      : formContextRole === UserRole.PURNA
        ? 'Pre-Register Purna Baru'
        : 'Pre-Register Anggota Baru';

  return (
    <div id="scout-member-modal-overlay" className="fixed inset-0 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-xl border border-bento-border text-left max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="font-sans text-base font-extrabold text-bento-text">{title}</h3>
          <button
            id="btn-close-member-modal"
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-semibold">
              ⚠️ {formError}
            </div>
          )}

          {!isEditMode && (
            <p className="text-[11px] text-bento-muted bg-bento-soft border border-bento-border rounded-xl p-3">
              {formContextRole === UserRole.ADMIN
                ? 'Pembina akan otomatis terhubung saat login dengan email Google yang sama.'
                : formContextRole === UserRole.PURNA
                  ? 'Purna cukup didaftarkan dengan email. Setelah login, mereka melengkapi biodata dan mengakses link dokumentasi.'
                  : 'Anggota akan otomatis terhubung saat login dengan email Google yang sama.'}
            </p>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Alamat Email (Login Google)
            </label>
            <input
              id="form-scout-email"
              type="email"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700"
              placeholder="Contoh: purna@gmail.com"
              value={formEmail}
              onChange={(e) => onFormEmailChange(e.target.value)}
              required
              disabled={isEditMode}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              Nama Lengkap{formContextRole === UserRole.PURNA && !isEditMode ? ' (opsional)' : ''}
            </label>
            <input
              id="form-scout-name"
              type="text"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-xs font-sans focus:outline-none focus:ring-2 focus:ring-emerald-700"
              placeholder={formContextRole === UserRole.PURNA ? 'Bisa dilengkapi saat login' : 'Contoh: Farhan Sanjaya'}
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              required={formContextRole !== UserRole.PURNA || isEditMode}
            />
          </div>

          {formContextRole !== UserRole.PURNA && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">
                  {formContextRole === UserRole.ADMIN ? 'Unit / Jabatan' : 'Kelas'}
                </label>
                <input
                  id="form-scout-class"
                  type="text"
                  className="w-full px-4 py-3 border border-bento-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                  placeholder={formContextRole === UserRole.ADMIN ? 'Contoh: Pembina' : 'Contoh: X.4 / XII IPS'}
                  value={formClass}
                  onChange={(e) => onFormClassChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">
                  {formContextRole === UserRole.ADMIN ? 'Bagian' : 'Regu Pramuka'}
                </label>
                <input
                  id="form-scout-squad"
                  type="text"
                  className="w-full px-4 py-3 border border-bento-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                  placeholder={formContextRole === UserRole.ADMIN ? 'Contoh: Staf' : 'Contoh: Garuda / Orchid'}
                  value={formSquad}
                  onChange={(e) => onFormSquadChange(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-bento-muted uppercase tracking-wider">Status</label>
            <select
              id="form-scout-status"
              className="w-full px-3 py-3 border border-bento-border rounded-xl text-xs font-semibold bg-bento-soft text-bento-text"
              value={formStatus}
              onChange={(e) => onFormStatusChange(e.target.value as UserStatus)}
            >
              <option value={UserStatus.AKTIF}>Aktif</option>
              <option value={UserStatus.NON_AKTIF}>Nonaktif</option>
            </select>
          </div>

          <input type="hidden" value={formRole} readOnly />

          <div className="flex gap-2 pt-4">
            <button
              id="btn-cancel-scout-form"
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold font-sans border border-slate-250 transition"
            >
              Batal
            </button>
            <button
              id="btn-save-scout-form"
              type="submit"
              className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs font-sans transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-97 shadow-sm"
            >
              <Check className="w-4 h-4" />
              {isEditMode ? 'Simpan Data' : 'Simpan Pre-Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
