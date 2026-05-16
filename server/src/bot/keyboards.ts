import { Keyboard } from 'grammy';

// Discipline-only menu. The 5 manual pillars (design / business / learning /
// explain / book / myscore) are temporarily muted while we focus on what
// the bot must enforce: reporting cadence + task ownership.
// PAUSED 2026-05-16: /standup and /brief hidden until we re-enable them
// (see server/src/bot/index.ts COMMAND_DESCRIPTIONS).
export const mainMenu = new Keyboard()
  .text('/status').row()
  .text('/report').row()
  .text('/cancel')
  .resized();

export const managerMenu = new Keyboard()
  .text('/today').row()
  .text('/offline').text('/online')
  .resized();
