import { CalendarDays, Zap, FileText, FileSignature, PackageCheck, X, HelpCircle, Sun, Moon, ListChecks } from 'lucide-react';

type CmdRow = {
  cmd: string;
  who: 'vibecoder' | 'manager';
  icon: React.ComponentType<{ className?: string }>;
  purpose: string;
};

const COMMANDS: CmdRow[] = [
  { cmd: '/standup', who: 'vibecoder', icon: CalendarDays, purpose: 'Утренний план. 5 вопросов: что сделал вчера, что сделаешь сегодня, главный deadline, blocker, конкретный результат к концу дня.' },
  { cmd: '/status', who: 'vibecoder', icon: Zap, purpose: 'Короткий статус в середине дня. Над чем работаешь сейчас, что успел с прошлого раза, blocker, в срок ли. Бот спросит сам 4 раза за день (10:00 / 12:00 / 14:00 / 16:00).' },
  { cmd: '/report', who: 'vibecoder', icon: FileText, purpose: 'Daily report до 18:00. Что сделал, что в процессе, blocker, что завтра, proof-ссылки, выполнил ли утреннее обещание.' },
  { cmd: '/brief', who: 'vibecoder', icon: FileSignature, purpose: 'Берёшь задачу — сразу фиксируешь: понимание, ожидаемый результат, шаги, self-deadline. Бот даст id брифа.' },
  { cmd: '/delivery <id>', who: 'vibecoder', icon: PackageCheck, purpose: 'Закрываешь brief по id. Что сделано, как проверить, screens/video, edge cases. Автоматически отмечает «в срок / позже дедлайна».' },
  { cmd: '/cancel', who: 'vibecoder', icon: X, purpose: 'Отменить текущий wizard, если что-то пошло не так.' },
  { cmd: '/help', who: 'vibecoder', icon: HelpCircle, purpose: 'Короткая подсказка по командам.' },
  { cmd: '/today', who: 'manager', icon: ListChecks, purpose: 'Сводка по команде за сегодня (on-time / late / pending). Бот сам присылает её в DM в 10:00, 14:00 и 18:00.' },
  { cmd: '/offline <reason>', who: 'manager', icon: Moon, purpose: 'Сообщить, что менеджер не на связи (просто метка в БД — на расписание /status это больше не влияет).' },
  { cmd: '/online', who: 'manager', icon: Sun, purpose: 'Снять метку offline.' },
];

// Sidebar reflects the current slimmed nav. Weekly review, Monthly scores
// and Growth logs are hidden until the 5 manual-pillar wizards come back —
// don't list them here, otherwise the manager goes hunting for menu items
// that aren't there.
const SIDEBAR: Array<{ label: string; purpose: string }> = [
  { label: 'Daily', purpose: 'Одна строка на каждого vibecoder за выбранный день: standup ✓/✗, статус report (on-time / late / missed / pending), proof, обещание, blocker. По умолчанию сегодня. Кто наверху — нужно внимание.' },
  { label: 'Stand-up', purpose: 'Утренние ответы за выбранный день. Кто что обещал к концу дня.' },
  { label: 'Status', purpose: 'Status-апдейты за последние 12 часов. Поиск, например, по слову «blocker».' },
  { label: 'Team', purpose: 'Roster: добавить или редактировать vibecoder, привязать @username, проставить базовую зарплату и baseline бонуса, поставить на паузу.' },
  { label: 'Settings', purpose: 'Аккаунт (твой email, кнопка «Выйти»), состояние бота, расписание (что и когда бот делает).' },
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
          его в течение дня — стэндап утром, статусы каждые 2 часа, отчёт вечером. Менеджер скроллит
          группу и видит день каждого человека одним постом.
        </p>
      </div>

      {/* Concrete walkthrough of a real day. Helps a manager visualize
          before they live the cadence themselves. */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Один день в системе</h2>
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden divide-y divide-border/40">
          <Step time="09:14" actor="Aziz">
            Бот DM-ит: «☀️ /standup». Aziz отвечает на 5 вопросов. В группе появляется его карта дня:
            <Card>
              {`📅 15/05/2026 · Aziz Karimov · ⏳ pending\n\n☀️ Stand-up · 09:14\nВчера: закончил onboarding flow\nСегодня: выкатить /invoices в staging\nDeadline: завтра 18:00\nBlocker: нет\nEOD: страница /invoices работает на staging`}
            </Card>
          </Step>
          <Step time="10:05" actor="Менеджер">
            Бот присылает DM:
            <Card>
              {`📅 2026-05-15\nOn-time: 0\nLate: 0\nPending: 4 / 5\nMissing: Bekzod, Islom, Jasurbek, Samandar`}
            </Card>
            Stand-up пока сделал только Aziz. Если кто-то ещё не отвечает к 10:30 — можно ткнуть лично.
          </Step>
          <Step time="14:00" actor="Aziz">
            Бот DM-ит: «⚡ /status». Карта в группе обновляется (это та же самая, не новая):
            <Card>
              {`📅 15/05/2026 · Aziz Karimov · ⏳ pending\n\n☀️ Stand-up · 09:14 …\n⚡ 13:58 · invoice фильтры · сейчас: добавляю пагинацию · blocker: нет · в срок: ✅`}
            </Card>
          </Step>
          <Step time="17:42" actor="Bekzod">
            Получает финальное напоминание (бот DM-ит в 17:30 тем, кто ещё не сдал отчёт). Открывает бота и пишет /report.
          </Step>
          <Step time="18:02" actor="Aziz">
            Отправляет /report. Карта закрывается:
            <Card>
              {`📅 15/05/2026 · Aziz Karimov · ✅ on-time\n\n☀️ Stand-up · 09:14 …\n⚡ 10:00 · …\n⚡ 12:00 · …\n⚡ 14:00 · …\n⚡ 16:00 · …\n\n📋 Report · 18:02\nСделал: invoice list + фильтры + пагинация\nProof: https://staging.../invoices\nPromise: ✅`}
            </Card>
          </Step>
          <Step time="18:00" actor="Менеджер">
            Бот выкладывает в группу итог дня и шлёт менеджеру DM:
            <Card>
              {`📊 Daily summary · 2026-05-15\nOn-time: 4\nLate: 0\nMissed: 1\nИтого активных: 5`}
            </Card>
            Один человек пропустил отчёт (Jasurbek). Бот пометил его «missed».
          </Step>
          <Step time="18:30" actor="Менеджер">
            Открывает <b>Daily</b> в админке. Jasurbek наверху (статус missed). Кликает имя → видит, что
            за день не было ни одного /status. Утром в личке поговорить — почему день прошёл без сигнала.
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
                return (
                  <tr key={c.cmd} className="border-t border-border/40">
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2 font-mono text-[13px]">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        {c.cmd}
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
          <li><span className="font-medium">09:00</span> — бот DM-ит: «/standup». Карта дня создаётся.</li>
          <li><span className="font-medium">10:00 / 12:00 / 14:00 / 16:00</span> — если за 90 минут нет статуса, бот DM-ит: «/status». Карта обновляется.</li>
          <li><span className="font-medium">12:00 и 17:30</span> — мягкое и финальное напоминание про /report, если ещё не отправлен.</li>
          <li><span className="font-medium">18:00</span> — окно отчёта закрывается. Кто не отправил — помечается missed. Сводка по команде уходит в группу.</li>
          <li><span className="font-medium">10:00 / 14:00 / 18:00</span> — менеджер получает DM-сводку (on-time / late / pending + кто пропускает).</li>
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
        «Группа подключена» = ✓ и режим бота = «webhook». Если карта в группе не редактируется — бот должен быть админом этой группы.
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
