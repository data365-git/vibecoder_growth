import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { api, clearToken } from '../api/client';

interface Me {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
}

interface BotStatus {
  botMode: 'webhook' | 'polling' | 'off';
  groupConfigured: boolean;
  timezone: string;
  version: string;
}

interface ScheduleItem {
  time: string;
  days: string;
  what: string;
}

// Mirror of server/src/scheduler.ts — keep these in sync by hand when the
// cron table changes. The page is intentionally read-only: editing the
// schedule isn't supported yet.
const SCHEDULE: ScheduleItem[] = [
  { time: '09:00', days: 'Пн–Сб', what: 'Напоминание /standup всем активным вайбкодерам' },
  { time: '10:00', days: 'Пн–Сб', what: 'Напоминание /status, если не было обновления 90 мин' },
  { time: '10:00', days: 'Пн–Сб', what: 'Сводка дня менеджерам (как /today)' },
  { time: '12:00', days: 'Пн–Сб', what: 'Напоминание /status, если не было обновления 90 мин' },
  { time: '12:00', days: 'Пн–Сб', what: 'Мягкое напоминание /report, если ещё не отправлен' },
  { time: '14:00', days: 'Пн–Сб', what: 'Напоминание /status, если не было обновления 90 мин' },
  { time: '14:00', days: 'Пн–Сб', what: 'Сводка дня менеджерам (как /today)' },
  { time: '16:00', days: 'Пн–Сб', what: 'Напоминание /status, если не было обновления 90 мин' },
  { time: '17:30', days: 'Пн–Сб', what: 'Финальное напоминание /report' },
  { time: '18:00', days: 'Пн–Сб', what: 'Закрытие окна отчётов, итоговая сводка в группу' },
  { time: '18:00', days: 'Пн–Сб', what: 'Сводка дня менеджерам (как /today)' },
  { time: '18:00', days: 'Вс', what: 'Напоминание менеджерам про weekly review' },
  { time: '09:00', days: '1-е число', what: 'Пересчёт авто-оценок за прошлый месяц' },
];

function roleLabel(role: string): string {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  return role;
}

function modeLabel(mode: BotStatus['botMode']): string {
  if (mode === 'webhook') return 'Webhook';
  if (mode === 'polling') return 'Polling';
  return 'Выключен';
}

function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="text-emerald-600 font-semibold">✓</span>
  ) : (
    <span className="text-rose-500 font-semibold">✗</span>
  );
}

interface WipeResult {
  ok: boolean;
  mode: 'today' | 'week';
  start: string;
  end: string;
  counts: Record<string, number>;
}

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/auth/me') });
  const status = useQuery({ queryKey: ['settings', 'status'], queryFn: () => api<BotStatus>('/settings/status') });
  const [lastWipe, setLastWipe] = useState<WipeResult | null>(null);

  const wipe = useMutation({
    mutationFn: (mode: 'today' | 'week') =>
      api<WipeResult>('/settings/wipe-data', { method: 'POST', body: JSON.stringify({ mode }) }),
    onSuccess: (data) => {
      setLastWipe(data);
      qc.invalidateQueries();
    },
  });

  function handleLogout() {
    clearToken();
    navigate('/login');
  }

  function confirmAndWipe(mode: 'today' | 'week') {
    const label = mode === 'today' ? 'сегодня' : 'эту неделю';
    if (window.confirm(`Удалить все данные за ${label}? Roster (вайбкодеры и менеджеры) сохранится. Это нельзя отменить.`)) {
      wipe.mutate(mode);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">Настройки</h1>
        <p className="text-sm text-muted-foreground mt-1">Аккаунт, состояние бота и расписание напоминаний.</p>
      </div>

      {/* 1. Account */}
      <section className="card-soft p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-[15px]">Аккаунт</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Вы вошли как</p>
        </div>
        {me.isLoading ? (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        ) : me.data ? (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="text-base font-medium truncate">{me.data.fullName ?? me.data.email}</div>
              <div className="text-sm text-muted-foreground truncate">{me.data.email}</div>
              <div className="mt-2">
                <span className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground/80">
                  {roleLabel(me.data.role)}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 shadow-sm"
            >
              Выйти
            </button>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Не удалось загрузить профиль.</div>
        )}
      </section>

      {/* 2. Bot status */}
      <section className="card-soft p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-[15px]">Состояние бота</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Системная информация, только чтение.</p>
        </div>
        {status.isLoading ? (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        ) : status.data ? (
          <dl className="divide-y divide-border/60">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted-foreground">Режим бота</dt>
              <dd className="text-sm font-medium">{modeLabel(status.data.botMode)}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted-foreground">Группа подключена</dt>
              <dd className="text-sm font-medium"><Check ok={status.data.groupConfigured} /></dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted-foreground">Часовой пояс</dt>
              <dd className="text-sm font-medium">{status.data.timezone}</dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-sm text-muted-foreground">Версия</dt>
              <dd className="text-sm font-medium">{status.data.version}</dd>
            </div>
          </dl>
        ) : (
          <div className="text-sm text-muted-foreground">Не удалось загрузить статус.</div>
        )}
      </section>

      {/* 3. Bot schedule */}
      <section className="card-soft p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-[15px]">Расписание бота</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Время по Ташкенту. Что и когда делает бот.</p>
        </div>
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="font-medium py-2 pr-4 pl-1 w-20">Время</th>
                <th className="font-medium py-2 pr-4 w-28">Дни</th>
                <th className="font-medium py-2 pr-1">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {SCHEDULE.map((row, i) => (
                <tr key={i}>
                  <td className="py-2.5 pr-4 pl-1 font-medium tabular-nums">{row.time}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{row.days}</td>
                  <td className="py-2.5 pr-1">{row.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          Расписание зашито в коде. Скажи мне если надо поменять.
        </p>
      </section>

      {/* 4. Danger zone — wipe transactional data */}
      <section className="card-soft p-5 space-y-4 border border-rose-200/70">
        <div>
          <h2 className="font-semibold text-[15px] text-rose-700">Опасная зона</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Удалить отчёты, stand-up&apos;ы, status updates, daily cards, briefs/deliveries и weekly reviews за выбранный
            период. Roster (вайбкодеры и менеджеры) сохраняется. Это нельзя отменить.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={wipe.isPending}
            onClick={() => confirmAndWipe('today')}
            className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 shadow-sm"
          >
            {wipe.isPending && wipe.variables === 'today' ? 'Удаляем…' : 'Удалить данные за сегодня'}
          </button>
          <button
            type="button"
            disabled={wipe.isPending}
            onClick={() => confirmAndWipe('week')}
            className="rounded-xl bg-rose-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 shadow-sm"
          >
            {wipe.isPending && wipe.variables === 'week' ? 'Удаляем…' : 'Удалить данные за эту неделю'}
          </button>
        </div>
        {wipe.isError ? (
          <div className="text-sm text-rose-600">Не получилось удалить — проверь права администратора.</div>
        ) : null}
        {lastWipe ? (
          <div className="text-xs text-muted-foreground">
            Удалено за {lastWipe.start === lastWipe.end ? lastWipe.start : `${lastWipe.start} … ${lastWipe.end}`}:{' '}
            {Object.entries(lastWipe.counts)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${k}: ${n}`)
              .join(' · ') || 'ничего не было'}
            .
          </div>
        ) : null}
      </section>
    </div>
  );
}
