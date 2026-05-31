/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield } from 'lucide-react';

interface AuthCardLayoutProps {
  title: string;
  subtitle: string;
  brandTitle?: string;
  brandSubtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCardLayout({
  title,
  subtitle,
  brandTitle = 'Percepat kegiatan pramuka dengan ForestBest Scout',
  brandSubtitle = 'Absensi, data anggota, dan dokumentasi purna — dalam satu platform.',
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="scout-auth-page">
      <div className="scout-auth-card">
        <aside className="scout-auth-brand" aria-hidden={false}>
          <div className="scout-auth-brand-inner">
            <p className="scout-auth-brand-kicker">ForestBest Scout</p>
            <div className="scout-auth-brand-icon">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="scout-auth-brand-title">{brandTitle}</h2>
            <p className="scout-auth-brand-text">{brandSubtitle}</p>
          </div>
        </aside>

        <div className="scout-auth-form-panel">
          <div className="scout-auth-form-head">
            <h1 className="scout-auth-form-title">{title}</h1>
            <p className="scout-auth-form-subtitle">{subtitle}</p>
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}

export function AuthDivider({ label = 'Atau' }: { label?: string }) {
  return (
    <div className="scout-auth-divider">
      <span>{label}</span>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder = '••••••••',
  hint,
  autoComplete = 'current-password',
}: PasswordFieldProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="scout-auth-label">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="scout-auth-input pr-11"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-bento-muted hover:text-bento-text"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
        >
          {visible ? 'Sembunyi' : 'Lihat'}
        </button>
      </div>
      {hint && <p className="text-[11px] text-bento-muted leading-relaxed">{hint}</p>}
    </div>
  );
}
