export type ConversationChannel =
  | "web"
  | "whatsapp"
  | "instagram"
  | "tiktok"
  | "discord";

export type ChatFilter = "all" | "unread" | "joined" | "groups";

export interface Conversation {
  id: string;
  name: string;
  channel: ConversationChannel;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  online: boolean;
  initials: string;
  credentialId?: string | null;
}
