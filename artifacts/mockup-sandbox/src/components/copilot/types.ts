export const MAX_MESSAGE_CHARS = 2000;

export interface ProductCardData {
  id: number;
  name: string;
  price: number | null;
  status: string | null;
}

export interface SourceLink {
  title: string;
  url: string;
  domain: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards: ProductCardData[];
  toolsUsed: string[];
  sources: SourceLink[];
  createdAt: number;
}

export type ChatErrorKind =
  | "network"
  | "timeout"
  | "rate_limit"
  | "busy"
  | "session"
  | "invalid"
  | "server"
  | "empty";

export interface ChatError {
  kind: ChatErrorKind;
  message: string;
  retryable: boolean;
}

export interface Conversation {
  localId: string;
  sessionId: string | null;
  title: string;
  messages: ChatMessage[];
  error: ChatError | null;
  contextLost: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  cards: ProductCardData[];
  toolsUsed: string[];
  sources: SourceLink[];
}
