import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Команда</h1>
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
          className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm"
        >
          + Добавить
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground border-b">
          <tr>
            <th className="py-2">Имя</th>
            <th>@</th>
            <th>Роль</th>
            <th>Salary</th>
            <th>Bonus baseline</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.data?.map((vc) => (
            <tr key={vc.id} className="border-b hover:bg-accent/40">
              <td className="py-2">{vc.fullNameRu}</td>
              <td>@{vc.tgUsername}</td>
              <td>{vc.role}</td>
              <td>{vc.baseSalaryUzs.toLocaleString()} UZS</td>
              <td>{vc.bonusBaselineUzs.toLocaleString()} UZS</td>
              <td>{vc.active ? '✅' : '⏸'}</td>
              <td>
                <button
                  onClick={() => setEditing(vc)}
                  className="text-xs text-primary underline"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
          <div className="bg-card border rounded-lg p-6 w-full max-w-md space-y-3">
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
                <label className="text-xs text-muted-foreground">{label}</label>
                <input
                  type={type as string}
                  value={(editing as any)[key as string] ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      [key as string]: type === 'number' ? Number(e.target.value) : e.target.value,
                    })
                  }
                  className="w-full rounded border bg-background px-3 py-2 text-sm"
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
                className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm"
              >
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="rounded border px-3 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
