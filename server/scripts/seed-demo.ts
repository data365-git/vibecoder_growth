/**
 * Generate ~30 days of demo activity for every active vibecoder.
 *
 * Persona profiles are tuned so a PM viewing the dashboard sees a realistic
 * spread: one star performer (≥90), one solid (~80), one borderline (~65),
 * one struggling (<60), plus the lead (Saidumar) at a strong but not perfect
 * level — covers every bonus tier in the system.
 */
import { and, eq, gte, lte } from 'drizzle-orm';
import { db, pool } from '../src/db/client.js';
import * as s from '../src/db/schema/growth.js';
import { syncNow } from '../src/notion/sync.js';
import { persistAutoScore } from '../src/scoring/compute.js';

type Persona = 'star' | 'solid' | 'borderline' | 'struggling' | 'lead';

interface ProfileWeights {
  reportSubmitRate: number;      // 0..1 chance a working day has a submission at all
  onTimeRate: number;            // among submissions, fraction on time (rest are late)
  designPerWeek: number;
  businessPerMonth: number;
  learningPerWeek: number;
  explainPerMonth: number;
  briefsCompleted: number;       // total briefs across the month
  briefsOnTimeRate: number;
  doBookReflection: boolean;
}

const PROFILES: Record<Persona, ProfileWeights> = {
  star:        { reportSubmitRate: 1.00, onTimeRate: 0.95, designPerWeek: 4, businessPerMonth: 5, learningPerWeek: 5, explainPerMonth: 5, briefsCompleted: 4, briefsOnTimeRate: 1.0,  doBookReflection: true  },
  solid:       { reportSubmitRate: 0.96, onTimeRate: 0.85, designPerWeek: 3, businessPerMonth: 4, learningPerWeek: 4, explainPerMonth: 3, briefsCompleted: 3, briefsOnTimeRate: 0.85, doBookReflection: true  },
  lead:        { reportSubmitRate: 0.98, onTimeRate: 0.90, designPerWeek: 3, businessPerMonth: 4, learningPerWeek: 4, explainPerMonth: 4, briefsCompleted: 4, briefsOnTimeRate: 0.90, doBookReflection: true  },
  borderline:  { reportSubmitRate: 0.85, onTimeRate: 0.70, designPerWeek: 2, businessPerMonth: 3, learningPerWeek: 2, explainPerMonth: 2, briefsCompleted: 2, briefsOnTimeRate: 0.50, doBookReflection: false },
  struggling:  { reportSubmitRate: 0.65, onTimeRate: 0.55, designPerWeek: 1, businessPerMonth: 1, learningPerWeek: 1, explainPerMonth: 1, briefsCompleted: 1, briefsOnTimeRate: 0.30, doBookReflection: false },
};

// tg_username (lower) → persona
const PERSONA_BY_USERNAME: Record<string, Persona> = {
  sardorov_saidumar:  'lead',
  samandar_work:      'star',
  jasurbek_work:      'solid',
  hikoyacii:          'borderline',
  abdulaziym_data365: 'struggling',
};

// ------- RNG (seeded so reruns are stable per persona) -------
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

// ------- Content pools -------
const DID_TODAY = [
  'Завершил миграцию модуля статистики на новый ORM, покрыл индексами hot-path запросы.',
  'Пересобрал онбординг-флоу под мобилку, исправил 4 layout-бага после QA.',
  'Дописал backfill-скрипт для исторических данных. Прогнал dry-run на staging.',
  'Реализовал webhook-приёмник Stripe + idempotency-таблицу, протестил retry-логику.',
  'Доразобрал спор по архитектуре кэша с командой, согласовали TTL и инвалидацию.',
  'Закрыл задачу по экспорту в CSV — потоковый, без OOM на больших выборках.',
  'Добавил throttling по тенанту в публичный API, написал интеграционные тесты.',
];
const COMPLETED = [
  'Эндпоинт /v2/dashboards · документация',
  'PR #214 — merge',
  'Compliance-чеклист закрыт',
  'Pull request для design system tokens',
  '3 ревью коллег',
];
const IN_PROGRESS = [
  'Refactor auth middleware (JWT → SSO)',
  'Оптимизация фронта /reports — virtual list',
  'Notion sync queue: backoff + dedup',
  'Спайк по WebSocket для realtime status grid',
];
const BLOCKERS = [
  'Жду доступа в Stripe sandbox от Bunyod',
  'Ревьюер в отпуске, нужно второе мнение',
  'Спецификация платёжки от клиента приходит частями',
  null, null, null, // most days no blocker
];
const PLANS = [
  'Закрыть PR и провести QA.',
  'Пройти оставшиеся тесты, отправить на ревью.',
  'Засеть на performance-исследование slow query.',
  'Подготовить демо для weekly review.',
];

const DESIGN_URLS = [
  'https://dribbble.com/shots/24919830',
  'https://www.behance.net/gallery/197654321',
  'https://mobbin.com/screens/airbnb-host',
  'https://refero.design/companies/linear',
  'https://land-book.com/sites/notion-3',
];
const DESIGN_OBSERVATIONS = [
  ['Иерархия через размер шрифта, без бордеров', 'Спокойная палитра — один акцент', 'Действия слева, контент справа — стабильный взгляд'],
  ['Карточки без теней, разделение через background tint', 'Большие числа сверху, мелкий контекст внизу', 'Кнопка primary только одна на экране'],
  ['Анимация только на изменение состояния, не на decoration', 'Иконки одного веса', 'Empty state с одной строкой и одной кнопкой'],
  ['Тёмная тема не инверсия светлой — другие тоны', 'Inline edit вместо модалок', 'Plot lines тонкие, без сетки'],
];
const APPLIED_IN = [
  'Перенёс в Dashboard карточку KPI',
  'Применил в форме нового feature',
  'Адаптировал в onboarding-флоу',
  null, null,
];

const BUSINESS_URLS = [
  'https://www.youtube.com/watch?v=DJjV6yrpJ3I',
  'https://www.lennysnewsletter.com/p/the-jobs-to-be-done-playbook',
  'https://www.figma.com/blog/the-anatomy-of-a-business-model/',
  'https://a16z.com/the-only-metric-that-matters/',
];
const BUSINESS_INSIGHTS = [
  ['Клиенты платят за устранение боли, не за фичи', 'Цена должна расти быстрее, чем стоимость поддержки', 'NRR > 100% — главный лидинг-индикатор', 'Onboarding это часть продукта', 'CAC окупается только когда churn падает'],
  ['Сегментация по job-to-be-done сильнее, чем по индустрии', 'Activation-метрика должна быть одна, не пять', 'Pricing-эксперимент — это два месяца минимум', 'Стартап-сейлы — это quality, не quantity', 'Сложность продукта = стоимость онбординга'],
  ['Платная команда даёт ARR в 4–6× быстрее, чем self-serve', 'Виральность не работает в B2B без явного выигрыша для users', 'Demo + trial убивает demo + trial. Один из них', 'Кейс-стади важнее white paper', 'Customer success — это не support'],
];
const CRM_LINK = [
  'Совпадает с нашим pricing-экспериментом в ERP — попробовать тиры на основе usage.',
  'Можно перенести в воронку: shortcut вместо длинного onboarding-флоу.',
  'Аналог их CS-плейбука можно встроить как чеклист в админку клиента.',
];
const CLIENT_PAINS = [
  'Клиент не понимает, какую метрику ему оптимизировать.',
  'PMs тратят 40% времени на сбор данных вручную.',
  'Onboarding длиннее 30 минут — пользователь не возвращается.',
];
const SOLUTIONS = [
  'Единая метрика на главной + контекстные подсказки на каждом шаге.',
  'Авто-сборка отчёта по событиям + кнопка “отправить боссу”.',
  'Onboarding в 3 экрана, остальное progressive disclosure.',
];

const LEARNING_URLS = [
  'https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster',
  'https://overreacted.io/before-you-memo/',
  'https://martinfowler.com/articles/feature-toggles.html',
  'https://www.fastruby.io/blog/database/migrations/zero-downtime-migrations.html',
];
const LEARNING_TOPICS = ['React performance', 'Database migrations', 'TypeScript types', 'Feature flags', 'Caching patterns'];
const LEARNING_TAKEAWAYS = [
  ['Колокация состояния даёт рендер-выигрыш почти бесплатно', 'memo — не оптимизация по умолчанию', 'Перенести state ближе к компоненту вместо подъёма наверх'],
  ['NOT NULL добавлять в две миграции, не одной', 'Backfill вне транзакции', 'index CONCURRENTLY на больших таблицах'],
  ['Generic constraints читаются как алгебра, держать их минимальными', 'Discriminated unions вместо boolean флагов', 'Branded types для id'],
];
const LEARNING_APPLY = [
  'Применил в /reports — убрал лишний контекст-провайдер.',
  'Переписал миграцию NOT NULL в две стадии.',
  'Перевёл id на branded типы в score-engine.',
];
const LEARNING_ACTION = [
  'Сделать аудит остальных страниц на колокацию.',
  'Добавить linter-правило на CONCURRENTLY в миграциях.',
  'Договориться с командой о паттерне branded id.',
];

const EXPLAIN_TECH = [
  'JWT-токены подписаны HMAC-SHA256 секретом сервера, expires_at в payload.',
  'Notion sync queue: exponential backoff с jitter, max 1h между попытками.',
  'Drizzle migrations: SQL файлы версионируются, hash в _journal.json гарантирует целостность.',
];
const EXPLAIN_SIMPLE = [
  'Это как штамп на пропуске — сервер ставит его при входе, потом проверяет, что не подделан.',
  'Если Notion упал, мы складываем заявки в очередь и пробуем снова — сначала быстро, потом всё реже.',
  'Это как нумерованный список изменений в БД — нельзя пропустить или поменять местами.',
];
const EXPLAIN_METAPHOR = [
  'Пропуск с печатью охранника',
  'Очередь к врачу: записался — придут позвать',
  'Дневник переезда: страницы в порядке, иначе адрес не найдёшь',
];
const EXPLAIN_VALUE = [
  'Клиенту не нужно входить заново каждые 5 минут, и при этом учётка не утечёт.',
  'Vibecoder отправил отчёт даже если внешний сервис лежит — данные не теряются.',
  'Откатить плохую миграцию можно без потерь — мы знаем что и в каком порядке.',
];

const BOOK_TITLES = [
  'Atomic Habits — James Clear',
  'Inspired — Marty Cagan',
  'The Pragmatic Programmer — Hunt & Thomas',
  'Designing Data-Intensive Applications — Kleppmann',
];
const BOOK_IDEAS = [
  'Маленькие повторяемые действия определяют идентичность сильнее, чем большие решения.',
  'Хороший продукт — это discovery + delivery, обе ветки одинаково важны.',
];
const BOOK_THOUGHTS = [
  ['Идентичность важнее цели', 'Окружение определяет привычку', 'Stacking новой привычки с существующей', '2-минутное правило', 'Plateau of latent potential'],
  ['Discovery никогда не заканчивается', 'PM ≠ project manager', 'Outcome > output', 'Team топология важнее процессов', 'Принципы > правила'],
];
const BOOK_COMMS = [
  'Помогло объяснить ритуалы команды через identity, а не процесс.',
  'Поменял язык: “мы делаем X” → “мы команда, которая делает X хорошо”.',
];
const BOOK_APPLY = [
  'Привязал утренний /standup к ритуалу команды — за 2 недели compliance 95%.',
  'Развернул discovery-такт раз в две недели, до этого был только delivery.',
];

const TASK_TITLES = [
  'Реализовать экспорт отчётов в CSV',
  'Перенести auth middleware на новую схему',
  'Добавить статусы заказа в админку',
  'Оптимизировать /reports — virtual scrolling',
  'Webhook Stripe → idempotency table',
];
const TASK_UNDERSTANDING =
  'PM хочет, чтобы менеджер мог за 1 клик выгрузить отчёт по своей команде. Текущий путь — это вручную копировать таблицу.';
const TASK_EXPECTED =
  'Кнопка "Export CSV" на странице /admin/growth/scores — генерирует и скачивает файл за <3 сек на 50 строк.';
const TASK_USER_FLOW = 'PM открывает страницу → видит таблицу → жмёт Export → файл скачивается → открывает в Numbers.';
const TASK_STEPS = [
  ['Добавить endpoint /api/scores/:ym/export?format=csv', 'Стримить через node:stream/web', 'Добавить кнопку с loading state', 'Тест на больших данных'],
  ['Заменить sign() на новый JWT провайдер', 'Прогнать на dev', 'Перевыпустить рабочие токены', 'Удалить старый код'],
];

// ------- Generators -------

async function seedDailyReports(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, days: Date[]) {
  for (const day of days) {
    const date = ymd(day);
    if (rng() > profile.reportSubmitRate) {
      // No submission → 18:00 cron would later mark missed. We insert a missed row directly so the demo shows it.
      await db
        .insert(s.dailyReports)
        .values({
          vibecoderId: vc.id,
          reportDate: date,
          didToday: '',
          plansTomorrow: '',
          proofLinks: [],
          status: 'missed',
        })
        .onConflictDoNothing();
      continue;
    }
    const onTime = rng() < profile.onTimeRate;
    const submittedHour = onTime ? 14 + Math.floor(rng() * 4) : 18 + Math.floor(rng() * 3);
    const submittedAt = new Date(day);
    submittedAt.setUTCHours(submittedHour - 5, Math.floor(rng() * 60), 0, 0); // -5h = Tashkent → UTC
    const didToday = pick(rng, DID_TODAY);
    const completed = pick(rng, COMPLETED);
    const inProgress = pick(rng, IN_PROGRESS);
    const blockers = pick(rng, BLOCKERS);
    const plans = pick(rng, PLANS);
    const proofLinks = rng() < 0.7 ? [`https://github.com/data365/repo/pull/${100 + Math.floor(rng() * 200)}`] : [];
    const wordCount = (didToday + ' ' + (completed ?? '') + ' ' + (inProgress ?? '') + ' ' + (blockers ?? '') + ' ' + plans)
      .split(/\s+/).filter(Boolean).length;
    await db
      .insert(s.dailyReports)
      .values({
        vibecoderId: vc.id,
        reportDate: date,
        didToday,
        completed,
        inProgress,
        blockers,
        plansTomorrow: plans,
        proofLinks,
        keptPromise: rng() < 0.8,
        submittedAt,
        status: onTime ? 'on_time' : 'late',
        hasProof: proofLinks.length > 0,
        wordCount,
      })
      .onConflictDoNothing();
  }
}

async function seedStandups(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, days: Date[]) {
  for (const day of days) {
    if (rng() > profile.reportSubmitRate * 0.9) continue;
    const submittedAt = new Date(day);
    submittedAt.setUTCHours(4 + Math.floor(rng() * 1), Math.floor(rng() * 60), 0, 0);
    await db
      .insert(s.dailyStandups)
      .values({
        vibecoderId: vc.id,
        standupDate: ymd(day),
        completedYesterday: pick(rng, COMPLETED),
        willCompleteToday: pick(rng, IN_PROGRESS),
        mainDeadline: pick(rng, ['Завтра вечером', 'Конец недели', 'Понедельник']),
        blocker: pick(rng, BLOCKERS),
        endOfDayDeliverable: pick(rng, IN_PROGRESS),
        submittedAt,
      })
      .onConflictDoNothing();
  }
}

async function seedDesignRefs(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthStart: Date, monthEnd: Date) {
  const total = Math.round((profile.designPerWeek * (monthEnd.getUTCDate() - monthStart.getUTCDate() + 1)) / 7);
  for (let i = 0; i < total; i++) {
    const day = addDays(monthStart, Math.floor(rng() * (monthEnd.getUTCDate() - 1)));
    const createdAt = new Date(day);
    createdAt.setUTCHours(10 + Math.floor(rng() * 8), Math.floor(rng() * 60), 0, 0);
    const observations = pick(rng, DESIGN_OBSERVATIONS);
    const [row] = await db
      .insert(s.designRefs)
      .values({
        vibecoderId: vc.id,
        refUrl: pick(rng, DESIGN_URLS),
        refImageUrl: null,
        observations,
        appliedInTask: pick(rng, APPLIED_IN),
        createdAt,
      })
      .returning();
    if (row) await syncNow('design_refs', row as any);
  }
}

async function seedBusinessNotes(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthStart: Date, monthEnd: Date) {
  for (let i = 0; i < profile.businessPerMonth; i++) {
    const day = addDays(monthStart, Math.floor(rng() * (monthEnd.getUTCDate() - 1)));
    const createdAt = new Date(day);
    createdAt.setUTCHours(15 + Math.floor(rng() * 5), Math.floor(rng() * 60), 0, 0);
    const insights = pick(rng, BUSINESS_INSIGHTS);
    const [row] = await db
      .insert(s.businessNotes)
      .values({
        vibecoderId: vc.id,
        sourceUrl: pick(rng, BUSINESS_URLS),
        sourceType: pick(rng, ['video', 'article', 'podcast'] as const),
        fiveInsights: insights,
        crmErpConnection: pick(rng, CRM_LINK),
        clientPain: pick(rng, CLIENT_PAINS),
        possibleSolution: pick(rng, SOLUTIONS),
        createdAt,
      })
      .returning();
    if (row) await syncNow('business_notes', row as any);
  }
}

async function seedLearningNotes(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthStart: Date, monthEnd: Date) {
  const total = Math.round((profile.learningPerWeek * (monthEnd.getUTCDate() - monthStart.getUTCDate() + 1)) / 7);
  for (let i = 0; i < total; i++) {
    const day = addDays(monthStart, Math.floor(rng() * (monthEnd.getUTCDate() - 1)));
    const createdAt = new Date(day);
    createdAt.setUTCHours(13 + Math.floor(rng() * 6), Math.floor(rng() * 60), 0, 0);
    const takeaways = pick(rng, LEARNING_TAKEAWAYS);
    const [row] = await db
      .insert(s.learningNotes)
      .values({
        vibecoderId: vc.id,
        sourceUrl: pick(rng, LEARNING_URLS),
        topic: pick(rng, LEARNING_TOPICS),
        threeTakeaways: takeaways,
        applicationText: pick(rng, LEARNING_APPLY),
        actionToTry: pick(rng, LEARNING_ACTION),
        createdAt,
      })
      .returning();
    if (row) await syncNow('learning_notes', row as any);
  }
}

async function seedExplainNotes(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthStart: Date, monthEnd: Date) {
  for (let i = 0; i < profile.explainPerMonth; i++) {
    const day = addDays(monthStart, Math.floor(rng() * (monthEnd.getUTCDate() - 1)));
    const createdAt = new Date(day);
    createdAt.setUTCHours(17 + Math.floor(rng() * 3), Math.floor(rng() * 60), 0, 0);
    const idx = Math.floor(rng() * EXPLAIN_TECH.length);
    const [row] = await db
      .insert(s.explainNotes)
      .values({
        vibecoderId: vc.id,
        technicalVersion: EXPLAIN_TECH[idx]!,
        simpleVersion: EXPLAIN_SIMPLE[idx]!,
        metaphor: EXPLAIN_METAPHOR[idx]!,
        businessValue: EXPLAIN_VALUE[idx]!,
        createdAt,
      })
      .returning();
    if (row) await syncNow('explain_notes', row as any);
  }
}

async function seedBookReflection(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthYearMonth: string) {
  if (!profile.doBookReflection) return;
  const titleIdx = Math.floor(rng() * BOOK_TITLES.length);
  const [row] = await db
    .insert(s.bookReflections)
    .values({
      vibecoderId: vc.id,
      monthYear: monthYearMonth,
      bookTitle: BOOK_TITLES[titleIdx]!,
      mainIdea: pick(rng, BOOK_IDEAS),
      fiveThoughts: pick(rng, BOOK_THOUGHTS),
      communicationHelp: pick(rng, BOOK_COMMS),
      workApplication: pick(rng, BOOK_APPLY),
    })
    .onConflictDoNothing()
    .returning();
  if (row) await syncNow('book_reflections', row as any);
}

async function seedBriefsAndDeliveries(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, monthStart: Date, monthEnd: Date) {
  for (let i = 0; i < profile.briefsCompleted; i++) {
    const startDay = addDays(monthStart, Math.floor(rng() * (monthEnd.getUTCDate() - 5)));
    const dueOffset = 3 + Math.floor(rng() * 4);
    const deadline = addDays(startDay, dueOffset);
    const onTime = rng() < profile.briefsOnTimeRate;
    const completedDay = onTime ? addDays(deadline, -Math.floor(rng() * 2)) : addDays(deadline, 1 + Math.floor(rng() * 2));
    const taskTitle = pick(rng, TASK_TITLES);
    const [brief] = await db
      .insert(s.taskOwnershipBriefs)
      .values({
        vibecoderId: vc.id,
        taskTitle,
        understanding: TASK_UNDERSTANDING,
        expectedResult: TASK_EXPECTED,
        userFlow: TASK_USER_FLOW,
        steps: pick(rng, TASK_STEPS),
        selfDeadline: deadline,
        risks: 'Возможны спайки при большом экспорте — нужно потоково.',
        openQuestions: 'Лимит на размер выгрузки? UI прогресс?',
        createdAt: startDay,
        completedAt: completedDay,
        onTime,
      })
      .returning();
    if (!brief) continue;
    await db
      .insert(s.finalDeliveries)
      .values({
        briefId: brief.id,
        whatDone: `Реализован ${taskTitle.toLowerCase()}, покрыт тестами, прошёл ревью.`,
        whatChanged: 'Добавлен новый endpoint + UI кнопка + миграция. Старый код помечен deprecated.',
        howToTest: '1) Открыть /admin/growth/scores → 2) Нажать Export → 3) Файл качается за < 3с.',
        screenshots: [],
        videoDemoUrl: null,
        edgeCasesChecked: 'Пустая таблица, 1000 строк, отсутствие прав, потеря соединения',
        knownIssues: rng() < 0.5 ? null : 'Большие выгрузки (>10k) пока не оптимальны.',
        futureImprovements: 'Добавить Excel формат, добавить фоновую генерацию через очередь.',
        submittedAt: completedDay,
      })
      .onConflictDoNothing();
  }
}

async function seedWeeklyReview(rng: () => number, vc: typeof s.vibecoders.$inferSelect, profile: ProfileWeights, weekStart: Date) {
  const start = new Date(weekStart);
  start.setUTCHours(0, 0, 0, 0);
  const end = addDays(start, 6);
  const designs = await db.select().from(s.designRefs).where(and(eq(s.designRefs.vibecoderId, vc.id), gte(s.designRefs.createdAt, start), lte(s.designRefs.createdAt, end)));
  const business = await db.select().from(s.businessNotes).where(and(eq(s.businessNotes.vibecoderId, vc.id), gte(s.businessNotes.createdAt, start), lte(s.businessNotes.createdAt, end)));
  const learning = await db.select().from(s.learningNotes).where(and(eq(s.learningNotes.vibecoderId, vc.id), gte(s.learningNotes.createdAt, start), lte(s.learningNotes.createdAt, end)));
  const explain  = await db.select().from(s.explainNotes ).where(and(eq(s.explainNotes.vibecoderId,  vc.id), gte(s.explainNotes.createdAt,  start), lte(s.explainNotes.createdAt,  end)));

  const designIds = designs.slice(0, 3).map((d) => d.id);
  const [row] = await db
    .insert(s.weeklyGrowthReviews)
    .values({
      vibecoderId: vc.id,
      weekStart: ymd(start),
      designRefIds: designIds,
      businessNoteId: business[0]?.id ?? null,
      learningNoteId: learning[0]?.id ?? null,
      explainNoteId: explain[0]?.id ?? null,
      improvementApplied: profile.briefsOnTimeRate > 0.8
        ? 'На основе learning о zero-downtime migrations переписал ALTER TABLE в две стадии — продакшен переехал без даунтайма.'
        : 'Применил наблюдения из design ref (один primary action) в форме нового feature.',
      taskExample: pick(rng, TASK_TITLES),
      managerNotes: 'Хороший progress на неделе. Просьба углубить раздел business — пять инсайтов местами поверхностные.',
      reviewedAt: addDays(end, 1),
    })
    .onConflictDoNothing()
    .returning();
  if (row) await syncNow('weekly_growth_reviews', row as any);
}

// ------- Main -------

async function resetDemoTables() {
  console.log('Resetting demo activity tables (preserving roster + settings)…');
  // Order matters: children before parents.
  const orderedTables = [
    s.scoreComponents,
    s.monthlyScores,
    s.weeklyGrowthReviews,
    s.finalDeliveries,
    s.taskOwnershipBriefs,
    s.bookReflections,
    s.explainNotes,
    s.learningNotes,
    s.businessNotes,
    s.designRefs,
    s.dailyStandups,
    s.statusUpdates,
    s.dailyReports,
    s.notionSyncQueue,
    s.botReminders,
  ];
  for (const tbl of orderedTables) {
    const r = await db.delete(tbl as any);
    console.log(`  cleared ${(tbl as any)[Symbol.for('drizzle:Name')] ?? '(table)'}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--reset')) {
    await resetDemoTables();
  }
  console.log('\nSeeding demo data: previous full calendar month (for scoring) + current partial month (live activity).');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Previous full calendar month — this is what auto-scoring will read.
  const prevMonthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
  const prevMonthStart = new Date(Date.UTC(prevMonthEnd.getUTCFullYear(), prevMonthEnd.getUTCMonth(), 1));
  const prevYm = `${prevMonthStart.getUTCFullYear()}-${String(prevMonthStart.getUTCMonth() + 1).padStart(2, '0')}`;

  // Current partial month — start of month up to yesterday.
  const curMonthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const curMonthEnd = addDays(today, -1);
  const curYm = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;

  function workingDaysIn(start: Date, end: Date): Date[] {
    const out: Date[] = [];
    const totalDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(start, i);
      if (d.getUTCDay() !== 0) out.push(d); // skip Sunday
    }
    return out;
  }

  const prevWorkingDays = workingDaysIn(prevMonthStart, prevMonthEnd);
  const curWorkingDays = workingDaysIn(curMonthStart, curMonthEnd);

  // Weekly review: last fully complete Mon–Sat block in the previous month.
  const reviewedWeekEnd = (() => {
    // Walk back from prevMonthEnd until Saturday
    let d = new Date(prevMonthEnd);
    while (d.getUTCDay() !== 6) d = addDays(d, -1);
    return d;
  })();
  const reviewedWeekStart = addDays(reviewedWeekEnd, -5); // Monday of that week

  const vibecoders = await db.select().from(s.vibecoders).where(eq(s.vibecoders.active, true));
  for (const vc of vibecoders) {
    const persona = PERSONA_BY_USERNAME[vc.tgUsername?.toLowerCase() ?? ''] ?? 'solid';
    const profile = PROFILES[persona];
    const rng = makeRng(vc.id * 1000 + 17);
    console.log(`\n→ ${vc.fullNameRu} (@${vc.tgUsername}) · persona=${persona}`);

    // -------- Previous month: full activity feed for scoring --------
    await seedDailyReports(rng, vc, profile, prevWorkingDays);
    await seedStandups(rng, vc, profile, prevWorkingDays);
    await seedDesignRefs(rng, vc, profile, prevMonthStart, prevMonthEnd);
    await seedBusinessNotes(rng, vc, profile, prevMonthStart, prevMonthEnd);
    await seedLearningNotes(rng, vc, profile, prevMonthStart, prevMonthEnd);
    await seedExplainNotes(rng, vc, profile, prevMonthStart, prevMonthEnd);
    await seedBookReflection(rng, vc, profile, prevYm);
    await seedBriefsAndDeliveries(rng, vc, profile, prevMonthStart, prevMonthEnd);
    await seedWeeklyReview(rng, vc, profile, reviewedWeekStart);
    console.log(`  · previous month (${prevYm}) fully populated`);

    // -------- Current month: partial activity so dashboards look live --------
    if (curWorkingDays.length > 0) {
      const halfProfile: ProfileWeights = { ...profile, designPerWeek: Math.max(1, Math.floor(profile.designPerWeek / 2)) };
      await seedDailyReports(rng, vc, halfProfile, curWorkingDays);
      await seedStandups(rng, vc, halfProfile, curWorkingDays);
      await seedDesignRefs(rng, vc, halfProfile, curMonthStart, curMonthEnd);
      await seedLearningNotes(rng, vc, halfProfile, curMonthStart, curMonthEnd);
      // No book reflection for current (it's a once-per-month entry — keep it for prev)
      console.log(`  · current month (${curYm}) partial activity`);
    }

    // -------- Score both months so /scores page is interesting --------
    await persistAutoScore(vc.id, prevYm);
    await persistAutoScore(vc.id, curYm);
    console.log(`  · auto-scored ${prevYm} (closed) + ${curYm} (in-progress)`);
  }

  console.log('\nDone. Open /scores/' + prevYm + ' in admin UI to see the full-month spread.');
  console.log('     Open /scores/' + curYm + ' to see in-progress month.');
  console.log('     Open /weekly to see the last reviewed week.');
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
