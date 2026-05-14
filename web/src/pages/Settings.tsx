import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';

export default function Settings() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['settings'], queryFn: () => api<Record<string, unknown>>('/settings') });
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');
  const save = useMutation({
    mutationFn: (data: { key: string; value: unknown }) =>
      api('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Tweak system-wide values (key → JSON value).</p>
      </div>

      <div className="card-soft p-5">
        <div className="text-xs font-medium text-muted-foreground mb-2">Current values</div>
        <pre className="text-xs whitespace-pre-wrap bg-muted/40 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(list.data ?? {}, null, 2)}
        </pre>
      </div>

      <div className="card-soft p-5 space-y-3">
        <h2 className="font-semibold text-[15px]">Set value</h2>
        <input
          placeholder="key (e.g. notion_db_ids)"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
        <textarea
          placeholder='JSON value, e.g. {"designTasteLog": "abc123..."}'
          rows={5}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          className="w-full rounded-xl border border-border/70 bg-card px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        />
        <button
          onClick={() => {
            try {
              const parsed = JSON.parse(draftValue);
              save.mutate({ key: draftKey, value: parsed });
            } catch {
              alert('Value must be valid JSON');
            }
          }}
          className="rounded-xl bg-primary text-white px-4 py-2 text-sm font-semibold hover:bg-primary/90 shadow-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}
