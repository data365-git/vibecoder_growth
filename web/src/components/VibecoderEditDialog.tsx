import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Input } from './Input';

export interface VibecoderDraft {
  id?: number;
  tgUsername: string | null;
  fullNameRu: string;
  role: string;
  baseSalaryUzs: number;
  bonusBaselineUzs: number;
  timezone: string;
  active: boolean;
}

export const BLANK_VIBECODER: VibecoderDraft = {
  tgUsername: '',
  fullNameRu: '',
  role: 'vibecoder',
  baseSalaryUzs: 0,
  bonusBaselineUzs: 0,
  timezone: 'Asia/Tashkent',
  active: true,
};

interface Props {
  value: VibecoderDraft;
  error: string | null;
  saving: boolean;
  onChange: (v: VibecoderDraft) => void;
  onClose: () => void;
  onSave: () => void;
}

// Rendered via a portal directly under <body> so it escapes any ancestor
// transform/overflow context and the z-index isn't fighting layout stacking.
export function VibecoderEditDialog({ value, error, saving, onChange, onClose, onSave }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof VibecoderDraft>(k: K, v: VibecoderDraft[K]) =>
    onChange({ ...value, [k]: v });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.fullNameRu.trim()) return;
          if (!(value.tgUsername ?? '').trim()) return;
          onSave();
        }}
        className="relative w-full max-w-md card-soft p-6 space-y-3 shadow-elevated bg-card"
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">{value.id ? 'Edit vibecoder' : 'New vibecoder'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted inline-flex items-center justify-center"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <Input label="ФИО" value={value.fullNameRu} onChange={(v) => set('fullNameRu', v)} required />
        <Input
          label="Telegram @username"
          value={value.tgUsername ?? ''}
          onChange={(v) => set('tgUsername', v.replace(/^@/, ''))}
          placeholder="без @"
          required
        />
        <Input label="Role" value={value.role} onChange={(v) => set('role', v)} />
        <Input
          label="Base salary (UZS)"
          type="number"
          value={String(value.baseSalaryUzs)}
          onChange={(v) => set('baseSalaryUzs', Number(v) || 0)}
        />
        <Input
          label="Bonus baseline (UZS)"
          type="number"
          value={String(value.bonusBaselineUzs)}
          onChange={(v) => set('bonusBaselineUzs', Number(v) || 0)}
        />
        <Input label="Timezone" value={value.timezone} onChange={(v) => set('timezone', v)} />
        <label className="flex items-center gap-2 text-sm pt-1">
          <input
            type="checkbox"
            checked={value.active}
            onChange={(e) => set('active', e.target.checked)}
          />
          Active
        </label>

        {error && (
          <div className="text-xs text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border/70 px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
