import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';

interface Vibecoder {
  id?: number;
  tgUsername: string | null;
  fullNameRu: string;
  role: string;
  baseSalaryUzs: number;
  bonusBaselineUzs: number;
  timezone: string;
  active: boolean;
}

const BLANK: Vibecoder = {
  tgUsername: '',
  fullNameRu: '',
  role: 'vibecoder',
  baseSalaryUzs: 0,
  bonusBaselineUzs: 0,
  timezone: 'Asia/Tashkent',
  active: true,
};

export default function Team() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const [editing, setEditing] = useState<Vibecoder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const save = useMutation({
    mutationFn: (v: Vibecoder) =>
      api<Vibecoder>('/vibecoders', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vibecoders'] });
      setEditing(null);
      setError(null);
    },
    onError: (e: any) => setError(e?.message ?? 'Save failed'),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/vibecoders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vibecoders'] });
      setConfirmDeleteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Команда</h1>
          <p className="text-sm text-muted-foreground mt-1">Vibecoder roster and compensation baselines</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setEditing({ ...BLANK });
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3.5 py-2.5 text-sm font-semibold hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>

      <div className="card-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border/60 bg-muted/40">
              <th className="text-left font-medium px-5 py-3">Vibecoder</th>
              <th className="text-left font-medium px-2 py-3">Username</th>
              <th className="text-left font-medium px-2 py-3">Role</th>
              <th className="text-left font-medium px-2 py-3">Salary</th>
              <th className="text-left font-medium px-2 py-3">Bonus baseline</th>
              <th className="text-left font-medium px-2 py-3">Active</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((vc) => (
              <tr key={vc.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={vc.fullNameRu} id={vc.id ?? 0} />
                    <span className="font-medium">{vc.fullNameRu}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-muted-foreground">@{vc.tgUsername ?? '—'}</td>
                <td className="px-2 py-3 text-muted-foreground">{vc.role}</td>
                <td className="px-2 py-3 tabular-nums">{Number(vc.baseSalaryUzs).toLocaleString()} UZS</td>
                <td className="px-2 py-3 tabular-nums">{Number(vc.bonusBaselineUzs).toLocaleString()} UZS</td>
                <td className="px-2 py-3">
                  {vc.active ? (
                    <span className="chip-success">Active</span>
                  ) : (
                    <span className="chip bg-muted text-muted-foreground">Paused</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setEditing({ ...vc });
                      }}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      Edit
                    </button>
                    {confirmDeleteId === vc.id ? (
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="text-muted-foreground">Delete?</span>
                        <button
                          type="button"
                          onClick={() => remove.mutate(vc.id!)}
                          disabled={remove.isPending}
                          className="font-medium text-danger hover:text-danger/80 disabled:opacity-50"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="font-medium text-muted-foreground hover:text-foreground"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(vc.id!)}
                        className="text-muted-foreground hover:text-danger transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {list.data?.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Пока никого нет. Жми «Добавить».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDialog
          value={editing}
          error={error}
          saving={save.isPending}
          onChange={setEditing}
          onClose={() => {
            setEditing(null);
            setError(null);
          }}
          onSave={() => save.mutate(editing)}
        />
      )}
    </div>
  );
}

// Rendered via a portal directly under <body> so it escapes any ancestor
// transform/overflow context and the z-index isn't fighting layout
// stacking. The previous in-tree modal at z-10 could end up obscured by
// the scroll container.
function EditDialog({
  value,
  error,
  saving,
  onChange,
  onClose,
  onSave,
}: {
  value: Vibecoder;
  error: string | null;
  saving: boolean;
  onChange: (v: Vibecoder) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = <K extends keyof Vibecoder>(k: K, v: Vibecoder[K]) => onChange({ ...value, [k]: v });

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

function Input({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
      />
    </div>
  );
}
