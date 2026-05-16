import { Zap, FileText, X, HelpCircle, Sun, Moon, ListChecks, PauseCircle } from 'lucide-react';

type CmdRow = {
  cmd: string;
  who: 'vibecoder' | 'manager';
  status?: 'paused';
  icon: React.ComponentType<{ className?: string }>;
  purpose: string;
};

// Active commands first, paused ones at the bottom with a clear tag so a
// new manager doesn't go hunting for something that's currently off.
const COMMANDS: CmdRow[] = [
  { cmd: '/status', who: 'vibecoder', icon: Zap, purpose: 'Короткий статус в середине дня. Над чем работаешь сейчас, что успел с прошлого раза, blocker, в срок ли. Бот спрашивает сам 4 раза за день (10:00 / 12:00 / 14:00 / 16:00).' },
  { cmd: '/report', who: 'vibecoder', icon: FileText, purpose: 'Daily report до 18:00. Что сделал, что в процессе, blocker, что завтра, proof-ссылки, выполнил ли утреннее обещание.' },
  { cmd: '/cancel', who: 'vibecoder', icon: X, purpose: 'Отменить текущий wizard, если что-то пошло не так.' },
  { cmd: '/help', who: 'vibecoder', icon: HelpCircle, purpose: 'Короткая подсказка по командам.' },
  { cmd: '/today', who: 'manager', icon: ListChecks, purpose: 'Сводка по команде за сегодня (vaqtida / kechikkan / kutilmoqda). Бот сам присылает её в DM в 10:00, 14:00 и 18:00.' },
  { cmd: '/offline <reason>', who: 'manager', icon: Moon, purpose: 'Сообщить, что менеджер не на связи — просто метка в БД, на расписание это не влияет.' },
  { cmd: '/online', who: 'manager', icon: Sun, purpose: 'Снять метку offline.' },
  { cmd: '/standup', who: 'vibecoder', status: 'paused', icon: PauseCircle, purpose: 'Утренний план (5 вопросов). На паузе с 2026-05-16 — фокус на /status + /report. Код и схема сохранены, можно включить обратно.' },
  { cmd: '/brief', who: 'vibecoder', status: 'paused', icon: PauseCircle, purpose: 'Взять задачу с self-deadline. На паузе с 2026-05-16.' },
  { cmd: '/delivery <id>', who: 'vibecoder', status: 'paused', icon: PauseCircle, purpose: 'Закрыть brief. На паузе с 2026-05-16.' },
  { cmd: '/settings', who: 'vibecoder', status: 'paused', icon: PauseCircle, purpose: 'Сменить язык. На паузе — пока бот общается только на узбекском (формальное «Siz»).' },
];

// Sidebar reflects the current slimmed nav. Weekly review, Monthly scores
// and Growth logs are hidden until the 5 manual-pillar wizards come back —
// don't list them here, otherwise the manager goes hunting for menu items
// that aren't there.
const SIDEBAR: Array<{ label: string; purpose: string }> = [
  { label: 'Daily', purpose: 'Одна строка на каждого vibecoder за выбранный день: статус report (vaqtida / kechikkan / yuborilmagan / kutilmoqda), proof, обещание, blocker. По умолчанию сегодня. Кто наверху — нужно внимание.' },
  { label: 'Status', purpose: 'Status-апдейты за последние 12 часов. Поиск, например, по слову «blocker».' },
  { label: 'Team', purpose: 'Roster: добавить или редактировать vibecoder, привязать @username, проставить базовую зарплату и baseline бонуса, поставить на паузу.' },
  { label: 'Settings', purpose: 'Аккаунт, состояние бота, расписание (что и когда бот делает), и опасная зона — удалить данные за сегодня или за неделю.' },
  { label: 'How it works', purpose: 'Эта страница.' },
];

export default function Help() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Как устроена система</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Один Telegram-бот + одна общая группа. Никаких топиков. На каждого vibecoder за каждый день
          бот публикует <span className="font-medium text-foreground">одно сообщение</span> и редактирует
          его в течение дня — /status каждые 2 часа, отчёт вечером. Менеджер скроллит группу и видит день
          каждого человека одним постом.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Бот общается с вайбкодерами <span className="font-medium text-foreground">только на узбекском</span>{' '}
          (формальное «Siz»). Русский и английский временно на паузе — файлы переводов сохранены, можно
          вернуть позже. Админка остаётся русской.
        </p>
      </div>

      {/* Concrete walkthrough of a real day. Helps a manager visualize
          before they live the cadence themselves. Examples mirror the
          actual server/src/bot/daily-card.ts output (HTML formatting is
          rendered as bold in Telegram). */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Один день в системе</h2>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          <Step time="09:14" actor="Aziz">
            Aziz открывает бота, видит приветствие на узбекском, начинает день. В группе пока ничего нет —
            карта появится после первого /status.
          </Step>
          <Step time="10:02" actor="Aziz">
            Бот DM-ит: «⚡ /status». Aziz отвечает на 5 вопросов. В группе появляется карта дня:
            <Card>
{`📅 2026-05-16 · Aziz Karimov
⏳ Kutilmoqda
━━━━━━━━━━━━━━━━━━━━

⚡ STATUS · 10:02
Vazifa: invoice list + filters
Hozir: pagination ustida
Blocker: yoʻq
Vaqtida: ✅ ha`}
            </Card>
          </Step>
          <Step time="10:05" actor="Менеджер">
            Бот присылает DM-сводку:
            <Card>
{`📅 2026-05-16
Vaqtida: 0
Kechikkan: 0
Yuborilmagan/Kutilmoqda: 5 / 5`}
            </Card>
            Никто ещё не сдал отчёт (нормально — рано). Если к 12:00 у кого-то нет ни одного /status — стоит ткнуть в личку.
          </Step>
          <Step time="14:00" actor="Aziz">
            Бот снова DM-ит: «⚡ /status». Та же карта в группе обновляется (это редактирование, не новое сообщение):
            <Card>
{`📅 2026-05-16 · Aziz Karimov
⏳ Kutilmoqda
━━━━━━━━━━━━━━━━━━━━

⚡ STATUS · 10:02
Vazifa: invoice list + filters
…

⚡ STATUS · 13:58
Vazifa: invoice filters
Oxirgi update'dan: pagination tugatildi
Hozir: edge case testlari
Blocker: yoʻq
Vaqtida: ✅ ha`}
            </Card>
          </Step>
          <Step time="17:30" actor="Bekzod">
            Получает финальное напоминание (бот DM-ит в 17:30 тем, кто ещё не сдал отчёт):
            <Card>
{`⏰ Oyna yopilishiga 30 daqiqa qoldi. Hozir /report yuboring.`}
            </Card>
            Открывает бота и пишет /report.
          </Step>
          <Step time="18:02" actor="Aziz">
            Отправляет /report. Карта закрывается финальным блоком:
            <Card>
{`📅 2026-05-16 · Aziz Karimov
✅ Vaqtida
━━━━━━━━━━━━━━━━━━━━

⚡ STATUS · 10:02 …
⚡ STATUS · 13:58 …
⚡ STATUS · 16:01 …

📋 HISOBOT · 18:02
Bajarilgan: invoice list + filters + pagination
Yakunlangan: PR #142
Jarayonda: edge case testlari
Blocker: yoʻq
Ertaga: code review
Proof: https://staging.../invoices
Vaʼda: ✅ ha`}
            </Card>
          </Step>
          <Step time="18:00" actor="Менеджер">
            Бот выкладывает в группу итог дня и шлёт менеджеру DM:
            <Card>
{`📊 Kunlik yakun · 2026-05-16
━━━━━━━━━━━━━━━━━━━━
Vaqtida: 4
Kechikkan: 0
Yuborilmagan: 1
Jami faol: 5`}
            </Card>
            Один человек пропустил отчёт (Jasurbek) — бот пометил «yuborilmagan».
          </Step>
          <Step time="18:30" actor="Менеджер">
            Открывает <b>Daily</b> в админке. Jasurbek наверху (статус yuborilmagan). Кликает имя → видит,
            что за день не было ни одного /status. Утром в личке поговорить — почему день прошёл без сигнала.
          </Step>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Команды бота</h2>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3 w-44">Команда</th>
                <th className="text-left px-4 py-3 w-24">Кто</th>
                <th className="text-left px-4 py-3">Что делает</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDS.map((c) => {
                const Icon = c.icon;
                const paused = c.status === 'paused';
                return (
                  <tr
                    key={c.cmd}
                    className={`border-t border-border/40 ${paused ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2 font-mono text-[13px]">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className={paused ? 'line-through decoration-muted-foreground/40' : ''}>{c.cmd}</span>
                        {paused ? (
                          <span className="ml-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            paused
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 ${
                          c.who === 'manager'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.who}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-foreground/85 leading-relaxed">
                      {c.purpose}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Ритм дня</h2>
        <ol className="space-y-2 text-sm text-foreground/85 list-decimal list-inside">
          <li><span className="font-medium">10:00 / 12:00 / 14:00 / 16:00</span> — если за 90 минут нет статуса, бот DM-ит: «/status». Карта обновляется.</li>
          <li><span className="font-medium">12:00 и 17:30</span> — мягкое и финальное напоминание про /report, если ещё не отправлен.</li>
          <li><span className="font-medium">18:00</span> — окно отчёта закрывается. Кто не отправил — помечается yuborilmagan. Сводка по команде уходит в группу.</li>
          <li><span className="font-medium">10:00 / 14:00 / 18:00</span> — менеджер получает DM-сводку (vaqtida / kechikkan / kutilmoqda + кто пропускает).</li>
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Пункты меню</h2>
        <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
          {SIDEBAR.map((s) => (
            <div key={s.label} className="px-4 py-3 flex gap-4 items-start text-sm">
              <div className="w-40 shrink-0 font-medium">{s.label}</div>
              <div className="text-muted-foreground">{s.purpose}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="text-xs text-muted-foreground border-t border-border/40 pt-4">
        Если что-то сломалось — открой <span className="font-mono">Settings</span>, проверь, что
        «Группа подключена» = ✓ и режим бота = «webhook». Если карта в группе не редактируется — бот
        должен быть админом этой группы.
      </section>
    </div>
  );
}

function Step({ time, actor, children }: { time: string; actor: string; children: React.ReactNode }) {
  return (
    <div className="p-4 grid grid-cols-[88px_1fr] gap-4">
      <div className="text-xs">
        <div className="font-semibold text-foreground tabular-nums">{time}</div>
        <div className="text-muted-foreground mt-0.5">{actor}</div>
      </div>
      <div className="text-sm leading-relaxed text-foreground/85 space-y-2">{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted/40 rounded-lg px-3 py-2 text-xs whitespace-pre-wrap font-mono leading-relaxed text-foreground/85">
      {children}
    </pre>
  );
}
