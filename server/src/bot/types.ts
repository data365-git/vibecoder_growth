import type { Context, SessionFlavor } from 'grammy';
import type { ConversationFlavor } from '@grammyjs/conversations';
import type { Lang } from './i18n/types.js';

export interface SessionData {
  // grammy session payload — kept tiny; conversations plugin stores its own
}

export type BotContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor<Context> & {
    // resolved by auth middleware before handlers
    vibecoderId?: number;
    managerId?: number;
    isManager?: boolean;
    // null until the user picks one (first /start prompts the language picker).
    lang?: Lang | null;
  };
