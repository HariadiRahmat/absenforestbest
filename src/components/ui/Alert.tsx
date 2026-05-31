import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface FriendlyError {
  title: string;
  message: string;
  tips?: string[];
}

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title: string;
  message?: string;
  tips?: string[];
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<
  AlertVariant,
  { wrap: string; icon: string; title: string; body: string; tip: string }
> = {
  error: {
    wrap: 'bg-rose-50/80 border-rose-100',
    icon: 'text-rose-500',
    title: 'text-rose-900',
    body: 'text-rose-700/90',
    tip: 'text-rose-600/80',
  },
  success: {
    wrap: 'bg-lime-50/80 border-lime-200',
    icon: 'text-lime-600',
    title: 'text-slate-900',
    body: 'text-slate-600',
    tip: 'text-slate-500',
  },
  warning: {
    wrap: 'bg-amber-50/80 border-amber-100',
    icon: 'text-amber-600',
    title: 'text-amber-950',
    body: 'text-amber-800/90',
    tip: 'text-amber-700/80',
  },
  info: {
    wrap: 'bg-blue-50/80 border-blue-100',
    icon: 'text-blue-500',
    title: 'text-slate-900',
    body: 'text-slate-600',
    tip: 'text-slate-500',
  },
};

const icons: Record<AlertVariant, React.ReactNode> = {
  error: <AlertCircle className="w-5 h-5" />,
  success: <CheckCircle2 className="w-5 h-5" />,
  warning: <AlertTriangle className="w-5 h-5" />,
  info: <Info className="w-5 h-5" />,
};

export function Alert({
  variant = 'info',
  title,
  message,
  tips,
  onDismiss,
  className = '',
}: AlertProps) {
  const s = styles[variant];

  return (
    <div
      role="alert"
      className={`w-full rounded-2xl border p-4 sm:p-5 ${s.wrap} ${className}`}
    >
      <div className="flex gap-3.5 sm:gap-4">
        <div className={`shrink-0 mt-0.5 ${s.icon}`}>{icons[variant]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-sm sm:text-[15px] font-semibold leading-snug ${s.title}`}>{title}</p>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {message && (
            <p className={`text-sm mt-2 leading-relaxed ${s.body}`}>{message}</p>
          )}
          {tips && tips.length > 0 && (
            <ul className={`mt-3 space-y-2 text-sm leading-relaxed ${s.tip}`}>
              {tips.map((tip) => (
                <li key={tip} className="flex gap-2.5">
                  <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-current opacity-60" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
