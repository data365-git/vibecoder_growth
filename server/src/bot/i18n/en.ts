import type { T } from './types.js';

export const en: T = {
  // ---------- Greetings / system ----------
  notLinked:
    'Hey! I couldn’t find you on the vibecoder list. Ask your manager to add your @username and try again.',
  notLinkedWithUsername: (username) =>
    username
      ? `Hey! I couldn’t find you on the vibecoder list. My bot sees your Telegram username as @${username}. Ask your manager to open the Team page and check that your @username is recorded exactly like that. Then send /start.`
      : `Hey! You don’t have a Telegram @username set — without it I can’t link you. Go to Settings → Edit profile in Telegram, set a username, and try again.`,
  // PAUSED 2026-05-16: /standup, /brief, /delivery temporarily disabled.
  linked: (name) =>
    `Hey ${name}! 👋\nYou’re connected to the Growth bot.\n\nHow it works:\n— You DM commands to me.\n— I bundle everything into one daily post in the shared group — your manager sees your whole day as one card.\n\nCommands:\n⚡ /status — quick status: what you’re working on right now\n📋 /report — end-of-day report (by 18:00)\n⚙️ /settings — change language\n❌ /cancel — cancel the current wizard`,
  cancel: 'Cancelled.',
  cancelHint: 'Type /cancel to cancel.',
  done: '✅ Saved.',
  noPermission: 'Managers only.',
  unknownCommand: 'Unknown command. Type /help.',
  reminderHint: 'I’ll remind you later — get it in before 18:00.',

  // ---------- Language picker / settings ----------
  chooseLanguage: 'Выбери язык / Choose language / Tilni tanlang:',
  languageChanged: '✅ Language saved.',
  settingsTitle: '⚙️ Settings — pick your language:',
  langButtonRu: '🇷🇺 Русский',
  langButtonEn: '🇬🇧 English',
  langButtonUz: '🇺🇿 O‘zbekcha',

  // ---------- Daily report ----------
  reportStart: '📋 Daily report. I’ll ask 7 short questions.\n\n1/7 — What did you work on today? (short list of tasks)',
  reportQ2: '2/7 — What did you finish today?',
  reportQ3: '3/7 — What’s still in progress?',
  reportQ4: '4/7 — Any blockers? (if none — type "no")',
  reportQ5: '5/7 — What are you planning to do tomorrow?',
  reportQ6: '6/7 — Send links / screenshots / video demos (or "no")',
  reportQ7: '7/7 — Did you deliver what you promised at this morning’s stand-up? (yes / no / partially)',
  reportLate: '⚠️ Report accepted, but after 18:00 — marked late.',
  reportClosed: '❌ The daily report window is closed (after 18:00). Talk to your manager so they can log a late report.',
  reportAlready: 'You already sent today’s daily report.',

  // ---------- Standup ----------
  standupStart: '☀️ Daily stand-up. 5 questions.\n\n1/5 — What did you finish yesterday?',
  standupQ2: '2/5 — What will you finish today?',
  standupQ3: '3/5 — What’s the main deadline today?',
  standupQ4: '4/5 — Any blocker? (or "no")',
  standupQ5: '5/5 — What concrete result will you show by end of day?',
  standupAlready: 'Today’s stand-up is already submitted.',

  // ---------- Status ----------
  statusStart: '⚡ Status update. 5 short questions.\n\n1/5 — What task are you working on right now?',
  statusQ2: '2/5 — What have you done since the last update?',
  statusQ3: '3/5 — What are you doing right now?',
  statusQ4: '4/5 — Any blocker? (or "no")',
  statusQ5: '5/5 — Are you on track for the deadline? (yes / no)',

  // ---------- Design ----------
  designStart: '🎨 Design reference.\n\n1/4 — Send a link (Pinterest, Dribbble, Mobbin, etc.)',
  designQ2: '2/4 — Send an image — or type "skip".',
  designQ3: '3/4 — At least 3 observations. Send one per line, then /next after the 3rd. Or send all 3+ at once separated by newlines.',
  designQ4: '4/4 — Where will you apply this, or where have you already? (task name or "not yet")',
  designNeedThree: 'Need at least 3 observations. So far:',

  // ---------- Business ----------
  businessStart: '💼 Business note.\n\n1/8 — Link to the source (podcast / interview / video)',
  businessQ2: '2/8 — Type: podcast / video / interview / article / other',
  businessQ3: '3/8 — Top 5 business insights. Send all 5 separated by newlines.',
  businessQ4: '4/8 — How does this connect to CRM / ERP / automation?',
  businessQ5: '5/8 — What customer pain does this help you understand?',
  businessQ6: '6/8 — What solution could you build for it?',
  businessNeedFive: 'Need 5 insights. So far:',

  // ---------- Learning ----------
  learningStart: '📚 Professional learning.\n\n1/5 — Link to the material',
  learningQ2: '2/5 — Short topic (1–5 words)',
  learningQ3: '3/5 — 3 key takeaways (separated by newlines)',
  learningQ4: '4/5 — How will you apply this at work?',
  learningQ5: '5/5 — One action you’ll try?',
  learningNeedThree: 'Need 3 takeaways. So far:',

  // ---------- Explain ----------
  explainStart: '🧩 Explain like client.\n\n1/4 — Technical version',
  explainQ2: '2/4 — Simple version',
  explainQ3: '3/4 — Metaphor (like a cashier / doorman / etc.)',
  explainQ4: '4/4 — Why it matters for business',

  // ---------- Book ----------
  bookStart: '📖 Book reflection (one per month).\n\n1/5 — Book title',
  bookQ2: '2/5 — Main idea in simple words',
  bookQ3: '3/5 — 5 useful takeaways (separated by newlines)',
  bookQ4: '4/5 — How does the book help you think or communicate better?',
  bookQ5: '5/5 — How will you apply this at work?',
  bookAlready: 'You already have a reflection for this month.',
  bookNeedFive: 'Need 5 takeaways. So far:',

  // ---------- Brief ----------
  briefStart: '📐 Task ownership brief.\n\n1/7 — Task name',
  briefQ2: '2/7 — How did you understand the task?',
  briefQ3: '3/7 — What’s the expected final result?',
  briefQ4: '4/7 — What’s the user flow?',
  briefQ5: '5/7 — Steps (separated by newlines)',
  briefQ6: '6/7 — Deadline (e.g. 2026-05-16 18:00 or "tomorrow 17:00")',
  briefQ7: '7/7 — Risks and open questions (or "no")',
  briefSavedHint: (id) => `Brief id: #${id}\nWhen the task is done, send: /delivery ${id}`,

  // ---------- Delivery ----------
  deliveryStart: (id) => `📦 Final delivery for brief #${id}.\n\n1/7 — What was done?`,
  deliveryQ2: '2/7 — What changed?',
  deliveryQ3: '3/7 — How to verify it (test plan)?',
  deliveryQ4: '4/7 — Screenshots (links separated by newlines) or "no"',
  deliveryQ5: '5/7 — Video demo (link) or "no"',
  deliveryQ6: '6/7 — Which edge cases were checked?',
  deliveryQ7: '7/7 — Known issues + what to improve later (or "no")',
  deliveryBriefNotFound: 'Brief not found, or it isn’t yours.',
  deliveryUsage: 'Usage: /delivery <briefId>',

  // ---------- Offline mode ----------
  offlineOn: '🌙 Offline mode is on. Status updates every 90 minutes until /online.',
  offlineOff: '🌞 Offline mode is off.',
  offlineAlreadyOn: 'Offline mode is already on.',
  offlineAlreadyOff: 'Offline mode is already off.',

  // ---------- Wrong-topic nudge ----------
  wrongTopicNudge: (cmd) =>
    `👀 Don’t write free-form text in this topic — your message will get lost. Open me in DM and run ${cmd}. I’ll post into the right topic and sign it with your name.`,

  // ---------- Helper prompts ----------
  helperPleaseSendText: 'Please send text.',
  helperHttpLinkNeeded: 'I need an http(s):// link. Try again.',
  helperNeedMore: (have, need) => `${have}/${need}. Try again.`,

  // ---------- Inline wizard fragments ----------
  briefNeedAtLeastOneStep: 'I need at least 1 step.',
  deliveryOnTime: '✅ On time.',
  deliveryLate: '⚠️ Past deadline.',

  // ---------- Scheduler DMs ----------
  nudgeReportSoft: '💡 Reminder: send /report before 18:00.',
  nudgeReportFinal: '⏰ 30 minutes left before the window closes. /report now.',
};
