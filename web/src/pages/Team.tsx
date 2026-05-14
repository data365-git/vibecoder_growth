import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../api/client';
import { Avatar } from '../components/Avatar';

interface Vibecoder {
  id: number;
  tgUsername: string | null;
  fullNameRu: string;
  role: string;
  baseSalaryUzs: number;
  bonusBaselineUzs: number;
  timezone: string;
  active: boolean;
}

export default function Team() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['vibecoders'], queryFn: () => api<Vibecoder[]>('/vibecoders') });
  const [editing, setEditing] = useState<Partial<Vibecoder> | null>(null);

  const save = useMutation({
    mutationFn: (v: Partial<Vibecoder>) =>
      api<Vibecoder>('/vibecoders', { method: 'POST', body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vibecoders'] });
      setEditing(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">Команда</h1>
          <p className="text-sm text-muted-foreground mt-1">Vibecoder roster and compensation baselines</p>
        </div>
        <button
          onClick={() =>
            setEditing({
              tgUsername: '',
              fullNameRu: '',
              role: 'vibecoder',
              baseSalaryUzs: 0,
              bonusBaselineUzs: 0,
              timezone: 'Asia/Tashkent',
              active: true,
            })
          }
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
                    <Avatar name={vc.fullNameRu} id={vc.id} />
                    <span className="font-medium">{vc.fullNameRu}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-muted-foreground">@{vc.tgUsername}</td>
                <td className="px-2 py-3 text-muted-foreground">{vc.role}</td>
                <td className="px-2 py-3 tabular-nums">{vc.baseSalaryUzs.toLocaleString()} UZS</td>
                <td className="px-2 py-3 tabular-nums">{vc.bonusBaselineUzs.toLocaleString()} UZS</td>
                <td className="px-2 py-3">
                  {vc.active ? (
                    <span className="chip-success">Active</span>
                  ) : (
                    <span className="chip bg-muted text-muted-foreground">Paused</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => setEditing(vc)} className="text-sm font-medium text-primary hover:text-primary/80">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4 z-10">
          <div className="card-soft p-6 w-full max-w-md space-y-3 shadow-elevated">
            <h2 className="text-lg font-semibold">{editing.id ? 'Edit' : 'New'} vibecoder</h2>
            {[
              ['fullNameRu', 'ФИО', 'text'],
              ['tgUsername', 'Telegram @username', 'text'],
              ['role', 'Role', 'text'],
              ['baseSalaryUzs', 'Base salary (UZS)', 'number'],
              ['bonusBaselineUzs', 'Bonus baseline (UZS)', 'number'],
              ['timezone', 'Timezone', 'text'],
            ].map(([key, label, type]) => (
              <div key={key as string}>
                <label className="text-xs font-medium text-muted-foreground">{label}</label>
                <input
                  type={type as string}
                  value={(editing as any)[key as string] ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      [key as string]: type === 'number' ? Number(e.target.value) : e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-border/70 bg-card px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={editing.active ?? true}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => save.mutate(editing)}
                disabled={save.isPending}
                className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-primary/90"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-xl border border-border/70 px-4 py-2 text-sm hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
