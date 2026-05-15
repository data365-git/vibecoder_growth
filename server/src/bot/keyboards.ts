import { Keyboard } from 'grammy';

// Discipline-only menu. The 5 manual pillars (design / business / learning /
// explain / book / myscore) are temporarily muted while we focus on what
// the bot must enforce: reporting cadence + task ownership.
export const mainMenu = new Keyboard()
  .text('/standup').text('/status').row()
  .text('/report').row()
  .text('/brief').text('/cancel')
  .resized();

export const managerMenu = new Keyboard()
  .text('/today').row()
  .text('/offline').text('/online')
  .resized();
