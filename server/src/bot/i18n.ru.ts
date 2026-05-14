export const t = {
  // Greetings / system
  notLinked: 'Привет! Я не нашёл тебя в списке vibecoder’ов. Попроси менеджера добавить твой @username и попробуй снова.',
  linked: (name: string) => `Привет, ${name}! 👋\nТы подключён к системе Growth.\n\nКоманды:\n/report — daily report\n/standup — утренний stand-up\n/status — status update (только когда менеджер offline)\n/design — design reference\n/business — business note\n/learning — professional learning\n/explain — объясни простыми словами\n/book — book reflection\n/brief — task ownership brief\n/delivery — final delivery\n/myscore — мой текущий score`,
  cancel: 'Отменено.',
  cancelHint: 'Напиши /cancel чтобы отменить.',
  done: '✅ Сохранено.',
  noPermission: 'Только для менеджеров.',
  unknownCommand: 'Неизвестная команда. Напиши /help.',
  reminderHint: 'Напомню позже — успей до 18:00.',

  // Daily report
  reportStart: '📋 Daily report. Я задам 7 коротких вопросов.\n\n1/7 — Что ты делал сегодня? (короткий список задач)',
  reportQ2: '2/7 — Что ты завершил сегодня?',
  reportQ3: '3/7 — Что осталось в процессе?',
  reportQ4: '4/7 — Были ли blockers? (если нет — напиши "нет")',
  reportQ5: '5/7 — Что планируешь сделать завтра?',
  reportQ6: '6/7 — Пришли ссылки / скриншоты / видео-демо (или "нет")',
  reportQ7: '7/7 — Ты выполнил то, что обещал утром на stand-up? (да / нет / частично)',
  reportLate: '⚠️ Отчёт принят, но позже 18:00 — отметка late.',
  reportClosed: '❌ Окно для daily report закрыто (после 18:00). Поговори с менеджером, чтобы он зафиксировал поздний отчёт.',
  reportAlready: 'Ты уже отправил daily report сегодня.',

  // Standup
  standupStart: '☀️ Daily stand-up. 5 вопросов.\n\n1/5 — Что ты завершил вчера?',
  standupQ2: '2/5 — Что завершишь сегодня?',
  standupQ3: '3/5 — Какой главный deadline сегодня?',
  standupQ4: '4/5 — Есть ли blocker? (или "нет")',
  standupQ5: '5/5 — Какой конкретный результат покажешь к концу дня?',
  standupAlready: 'Stand-up за сегодня уже отправлен.',

  // Status (offline mode)
  statusStart: '⚡ Status update. 5 коротких вопросов.\n\n1/5 — Над какой задачей работаешь сейчас?',
  statusQ2: '2/5 — Что сделал с последнего update?',
  statusQ3: '3/5 — Что делаешь прямо сейчас?',
  statusQ4: '4/5 — Есть ли blocker? (или "нет")',
  statusQ5: '5/5 — Успеваешь по deadline? (да / нет)',
  statusNotOffline: 'Status updates включены только когда менеджер написал /offline. Сейчас не нужно.',

  // Design
  designStart: '🎨 Design reference.\n\n1/4 — Пришли ссылку (Pinterest, Dribbble, Mobbin, etc.)',
  designQ2: '2/4 — Пришли изображение (картинку) — или напиши "пропустить".',
  designQ3: '3/4 — Минимум 3 наблюдения. Напиши по одной строке за раз, и команду /next после 3-го. Или сразу отправь все 3+ через переносы строк.',
  designQ4: '4/4 — Где ты это применишь или уже применил? (название задачи или "пока нет")',
  designNeedThree: 'Нужно минимум 3 наблюдения. Сейчас:',

  // Business
  businessStart: '💼 Business note.\n\n1/8 — Ссылка на материал (подкаст / интервью / видео)',
  businessQ2: '2/8 — Тип: podcast / video / interview / article / other',
  businessQ3: '3/8 — 5 главных бизнес-инсайтов. Отправь все 5 через переносы строк.',
  businessQ4: '4/8 — Как это связано с CRM / ERP / automation?',
  businessQ5: '5/8 — Какую боль клиента это помогает понять?',
  businessQ6: '6/8 — Какое решение можно было бы построить?',
  businessNeedFive: 'Нужно 5 инсайтов. Сейчас:',

  // Learning
  learningStart: '📚 Professional learning.\n\n1/5 — Ссылка на материал',
  learningQ2: '2/5 — Короткая тема (1–5 слов)',
  learningQ3: '3/5 — 3 главные мысли (через переносы строк)',
  learningQ4: '4/5 — Как это применить в работе?',
  learningQ5: '5/5 — Одно действие, которое попробуешь сделать?',
  learningNeedThree: 'Нужно 3 мысли. Сейчас:',

  // Explain
  explainStart: '🧩 Explain like client.\n\n1/4 — Technical version',
  explainQ2: '2/4 — Simple version',
  explainQ3: '3/4 — Metaphor (как у кассира / швейцара / и т.п.)',
  explainQ4: '4/4 — Why it matters for business',

  // Book
  bookStart: '📖 Book reflection (одна в месяц).\n\n1/5 — Название книги',
  bookQ2: '2/5 — Основная идея простыми словами',
  bookQ3: '3/5 — 5 полезных мыслей (через переносы строк)',
  bookQ4: '4/5 — Как книга помогает лучше думать или коммуницировать?',
  bookQ5: '5/5 — Как это применить в работе?',
  bookAlready: 'Reflection за этот месяц уже есть.',
  bookNeedFive: 'Нужно 5 мыслей. Сейчас:',

  // Brief
  briefStart: '📐 Task ownership brief.\n\n1/7 — Название задачи',
  briefQ2: '2/7 — Как ты понял задачу?',
  briefQ3: '3/7 — Какой ожидаемый финальный результат?',
  briefQ4: '4/7 — Какой user flow?',
  briefQ5: '5/7 — Шаги (через переносы строк)',
  briefQ6: '6/7 — Дедлайн (например: 2026-05-16 18:00 или "завтра 17:00")',
  briefQ7: '7/7 — Риски и открытые вопросы (или "нет")',

  // Delivery
  deliveryStart: (id: number) => `📦 Final delivery для brief #${id}.\n\n1/7 — Что было сделано?`,
  deliveryQ2: '2/7 — Что изменилось?',
  deliveryQ3: '3/7 — Как это проверить (test plan)?',
  deliveryQ4: '4/7 — Screenshots (ссылки через переносы) или "нет"',
  deliveryQ5: '5/7 — Video demo (ссылка) или "нет"',
  deliveryQ6: '6/7 — Какие edge cases проверены?',
  deliveryQ7: '7/7 — Known issues + что улучшить позже (или "нет")',
  deliveryBriefNotFound: 'Brief не найден или не твой.',

  // Offline mode
  offlineOn: '🌙 Offline mode включён. Status updates каждые 90 минут до /online.',
  offlineOff: '🌞 Offline mode выключен.',
  offlineAlreadyOn: 'Offline mode уже включён.',
  offlineAlreadyOff: 'Offline mode и так выключен.',
};
