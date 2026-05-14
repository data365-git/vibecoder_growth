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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded border bg-card p-4">
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(list.data ?? {}, null, 2)}</pre>
      </div>
      <div className="rounded border bg-card p-4 space-y-2">
        <h2 className="font-semibold">Set value</h2>
        <input
          placeholder="key (e.g. notion_db_ids)"
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          className="w-full rounded border bg-background px-3 py-2 text-sm"
        />
        <textarea
          placeholder='JSON value, e.g. {"designTasteLog": "abc123..."}'
          rows={4}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          className="w-full rounded border bg-background px-3 py-2 text-sm font-mono"
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
          className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
}
