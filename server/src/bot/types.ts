import type { Context, SessionFlavor } from 'grammy';
import type { ConversationFlavor } from '@grammyjs/conversations';

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
  };
