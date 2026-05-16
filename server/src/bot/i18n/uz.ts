import type { T } from './types.js';

export const uz: T = {
  // ---------- Greetings / system ----------
  notLinked:
    'Salom! Sizni vibecoderʼlar roʻyxatidan topa olmadim. Menejerdan @username’ingizni qoʻshishni soʻrab, qayta urinib koʻring.',
  notLinkedWithUsername: (username) =>
    username
      ? `Salom! Sizni vibecoderʼlar roʻyxatidan topa olmadim. Botim Sizning Telegram username’ingizni @${username} deb koʻryapti. Menejerdan Team page’ni ochib, @username’ingiz aynan shunday yozilganini tekshirishni soʻrang. Keyin /start yuboring.`
      : `Salom! Telegram’da @username’ingiz oʻrnatilmagan — usiz men Sizni bogʻlay olmayman. Telegram’da Settings → Edit profile’ga kirib, username qoʻying va qayta urinib koʻring.`,
  // PAUSED 2026-05-16: /standup, /brief, /delivery, /settings temporarily disabled.
  linked: (name) =>
    `Salom, ${name}! 👋\nSiz Growth-botga ulandingiz.\n\nQanday ishlaymiz:\n— Siz menga shaxsiyga buyruqlar yozasiz.\n— Men hammasini bitta kunlik postga umumiy guruhda jamlayman — menejer kuningizni bitta karta sifatida koʻradi.\n\nBuyruqlar:\n⚡ /status — qisqa status: hozir nima ustida ishlayapsiz\n📋 /report — kunlik hisobot (18:00 gacha)\n❌ /cancel — joriy wizard’ni bekor qilish`,
  cancel: 'Bekor qilindi.',
  cancelHint: 'Bekor qilish uchun /cancel yozing.',
  done: '✅ Saqlandi.',
  noPermission: 'Faqat menejerlar uchun.',
  unknownCommand: 'Notanish buyruq. /help yozing.',
  reminderHint: 'Keyinroq eslataman — 18:00 gacha ulgurasiz.',

  // ---------- Language picker / settings ----------
  chooseLanguage: 'Выбери язык / Choose language / Tilni tanlang:',
  languageChanged: '✅ Til saqlandi.',
  settingsTitle: '⚙️ Sozlamalar — tilni tanlang:',
  langButtonRu: '🇷🇺 Русский',
  langButtonEn: '🇬🇧 English',
  langButtonUz: '🇺🇿 O‘zbekcha',

  // ---------- Daily report ----------
  reportStart: '📋 Daily report. Sizga 7 ta qisqa savol beraman.\n\n1/7 — Bugun nima ustida ishladingiz? (qisqa vazifalar roʻyxati)',
  reportQ2: '2/7 — Bugun nimani yakunladingiz?',
  reportQ3: '3/7 — Nima jarayonda qoldi?',
  reportQ4: '4/7 — Blocker’lar bormi? (agar yoʻq boʻlsa — "yoʻq" deb yozing)',
  reportQ5: '5/7 — Ertaga nima qilishni rejalashtiryapsiz?',
  reportQ6: '6/7 — Link / screenshot / video-demo yuboring (yoki "yoʻq")',
  reportQ7: '7/7 — Ertalabki stand-up’da vaʼda qilganingizni bajardingizmi? (ha / yoʻq / qisman)',
  reportLate: '⚠️ Hisobot qabul qilindi, lekin 18:00 dan keyin — late belgisi qoʻyildi.',
  reportClosed: '❌ Daily report oynasi yopildi (18:00 dan keyin). Kechikkan hisobotni rasmiylashtirish uchun menejer bilan gaplashing.',
  reportAlready: 'Siz bugun daily report’ni yuborgansiz.',

  // ---------- Standup ----------
  standupStart: '☀️ Daily stand-up. 5 ta savol.\n\n1/5 — Kecha nimani yakunladingiz?',
  standupQ2: '2/5 — Bugun nimani yakunlaysiz?',
  standupQ3: '3/5 — Bugungi asosiy deadline qaysi?',
  standupQ4: '4/5 — Blocker bormi? (yoki "yoʻq")',
  standupQ5: '5/5 — Kun oxiriga qanday aniq natija koʻrsatasiz?',
  standupAlready: 'Bugungi stand-up allaqachon yuborilgan.',

  // ---------- Status ----------
  statusStart: '⚡ Status update. 5 ta qisqa savol.\n\n1/5 — Hozir qaysi vazifa ustida ishlayapsiz?',
  statusQ2: '2/5 — Oxirgi update’dan beri nima qildingiz?',
  statusQ3: '3/5 — Aynan hozir nima qilyapsiz?',
  statusQ4: '4/5 — Blocker bormi? (yoki "yoʻq")',
  statusQ5: '5/5 — Deadline’ga ulguryapsizmi? (ha / yoʻq)',

  // ---------- Design ----------
  designStart: '🎨 Design reference.\n\n1/4 — Link yuboring (Pinterest, Dribbble, Mobbin, etc.)',
  designQ2: '2/4 — Rasm yuboring (tasvir) — yoki "oʻtkazib yuborish" deb yozing.',
  designQ3: '3/4 — Kamida 3 ta kuzatuv. Har birini alohida qatorda yozing, 3-chisidan keyin /next buyrugʻini yuboring. Yoki 3+ tasini bir martada qator tashlash bilan yuboring.',
  designQ4: '4/4 — Buni qayerda qoʻllaysiz yoki allaqachon qoʻlladingizmi? (vazifa nomi yoki "hali yoʻq")',
  designNeedThree: 'Kamida 3 ta kuzatuv kerak. Hozir:',

  // ---------- Business ----------
  businessStart: '💼 Business note.\n\n1/8 — Manbaga link (podcast / interview / video)',
  businessQ2: '2/8 — Turi: podcast / video / interview / article / other',
  businessQ3: '3/8 — 5 ta asosiy biznes-insight. Hammasini qator tashlash bilan yuboring.',
  businessQ4: '4/8 — Bu CRM / ERP / automation bilan qanday bogʻliq?',
  businessQ5: '5/8 — Mijozning qanday ogʻrigʻini tushunishga yordam beradi?',
  businessQ6: '6/8 — Qanday yechim qurish mumkin edi?',
  businessNeedFive: '5 ta insight kerak. Hozir:',

  // ---------- Learning ----------
  learningStart: '📚 Professional learning.\n\n1/5 — Manbaga link',
  learningQ2: '2/5 — Qisqa mavzu (1–5 soʻz)',
  learningQ3: '3/5 — 3 ta asosiy fikr (qator tashlash bilan)',
  learningQ4: '4/5 — Buni ishda qanday qoʻllaysiz?',
  learningQ5: '5/5 — Sinab koʻradigan bitta amal?',
  learningNeedThree: '3 ta fikr kerak. Hozir:',

  // ---------- Explain ----------
  explainStart: '🧩 Explain like client.\n\n1/4 — Technical version',
  explainQ2: '2/4 — Simple version',
  explainQ3: '3/4 — Metafora (kassir / eshik qorovuli / va h.k. kabi)',
  explainQ4: '4/4 — Why it matters for business',

  // ---------- Book ----------
  bookStart: '📖 Book reflection (oyiga bitta).\n\n1/5 — Kitob nomi',
  bookQ2: '2/5 — Asosiy gʻoya oddiy soʻzlar bilan',
  bookQ3: '3/5 — 5 ta foydali fikr (qator tashlash bilan)',
  bookQ4: '4/5 — Kitob yaxshiroq fikrlash yoki muloqot qilishga qanday yordam beradi?',
  bookQ5: '5/5 — Buni ishda qanday qoʻllaysiz?',
  bookAlready: 'Bu oy uchun reflection allaqachon bor.',
  bookNeedFive: '5 ta fikr kerak. Hozir:',

  // ---------- Brief ----------
  briefStart: '📐 Task ownership brief.\n\n1/7 — Vazifa nomi',
  briefQ2: '2/7 — Vazifani qanday tushundingiz?',
  briefQ3: '3/7 — Kutilayotgan yakuniy natija qanday?',
  briefQ4: '4/7 — User flow qanday?',
  briefQ5: '5/7 — Qadamlar (qator tashlash bilan)',
  briefQ6: '6/7 — Deadline (masalan: 2026-05-16 18:00 yoki "ertaga 17:00")',
  briefQ7: '7/7 — Risklar va ochiq savollar (yoki "yoʻq")',
  briefSavedHint: (id) => `Brief id: #${id}\nVazifa tayyor boʻlganda yuboring: /delivery ${id}`,

  // ---------- Delivery ----------
  deliveryStart: (id) => `📦 Final delivery — brief #${id} uchun.\n\n1/7 — Nima qilindi?`,
  deliveryQ2: '2/7 — Nima oʻzgardi?',
  deliveryQ3: '3/7 — Buni qanday tekshirish mumkin (test plan)?',
  deliveryQ4: '4/7 — Screenshots (linklar qator tashlash bilan) yoki "yoʻq"',
  deliveryQ5: '5/7 — Video demo (link) yoki "yoʻq"',
  deliveryQ6: '6/7 — Qaysi edge cases tekshirildi?',
  deliveryQ7: '7/7 — Known issues + keyinroq nimani yaxshilash kerak (yoki "yoʻq")',
  deliveryBriefNotFound: 'Brief topilmadi yoki Sizniki emas.',
  deliveryUsage: 'Foydalanish: /delivery <briefId>',

  // ---------- Offline mode ----------
  offlineOn: '🌙 Offline mode yoqildi. /online gacha har 90 daqiqada status updates.',
  offlineOff: '🌞 Offline mode oʻchirildi.',
  offlineAlreadyOn: 'Offline mode allaqachon yoqilgan.',
  offlineAlreadyOff: 'Offline mode allaqachon oʻchirilgan.',

  // ---------- Wrong-topic nudge ----------
  wrongTopicNudge: (cmd) =>
    `👀 Bu topikka erkin matn yozmang — maʼlumotlar yoʻqoladi. Meni shaxsiyda ochib ${cmd} buyrugʻini yuboring. Yozuvni kerakli topikka oʻzim joylayman va Sizning ismingiz bilan imzolayman.`,

  // ---------- Helper prompts ----------
  helperPleaseSendText: 'Iltimos, matn yuboring.',
  helperHttpLinkNeeded: 'http(s):// koʻrinishdagi link kerak. Yana urinib koʻring.',
  helperNeedMore: (have, need) => `${have}/${need}. Yana urinib koʻring.`,

  // ---------- Inline wizard fragments ----------
  briefNeedAtLeastOneStep: 'Kamida 1 ta qadam kerak.',
  deliveryOnTime: '✅ Vaqtida.',
  deliveryLate: '⚠️ Deadlinedan keyin.',

  // ---------- Scheduler DMs ----------
  nudgeReportSoft: '💡 Eslatma: 18:00 gacha /report yuboring.',
  nudgeReportFinal: '⏰ Oyna yopilishiga 30 daqiqa qoldi. Hozir /report yuboring.',
};
