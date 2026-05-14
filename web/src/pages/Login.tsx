import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ token: string }>(`/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      navigate('/daily');
    } catch (err) {
      setError('Неверный email или пароль');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-8 shadow">
        <h1 className="text-xl font-semibold">data365 · Growth admin</h1>
        <div>
          <label className="text-sm">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-sm">Пароль</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border bg-background px-3 py-2 text-sm"
          />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Вход…' : 'Войти'}
        </button>
      </form>
    </div>
  );
}
