import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';
import {
  VibecoderEditDialog,
  BLANK_VIBECODER,
  type VibecoderDraft,
} from '../components/VibecoderEditDialog';

type Vibecoder = VibecoderDraft;

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
            setEditing({ ...BLANK_VIBECODER });
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-3.5 py-2.5 text-sm font-semibold hover:bg-primary/90 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Добавить
        </button>
      </div>

      <div className="card-soft overflow-hidden overflow-x-auto">
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
        <VibecoderEditDialog
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
