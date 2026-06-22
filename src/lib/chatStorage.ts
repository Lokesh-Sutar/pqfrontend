export interface AgentCard {
  id: string;
  runId: string;
  title: string;
  tools: {
    name: string;
    duration?: number;
    startTime?: number;
    args?: any;
    result?: any;
  }[];
  content: string;
  taskDescription?: string;
  startTime?: number;
  totalDuration?: number;
}

export interface ToolDetails {
  name: string;
  args?: any;
  result?: any;
  duration?: number;
  agent: string;
}

export interface Message {
  type: "user" | "ai-processing" | "ai-response";
  content: string;
  cards?: AgentCard[];
  finalCard?: { title: string; content: string; tickers?: string[] };
  tickers?: string[];
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "personaquant-chats";

export function getAllChats(): ChatSession[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as ChatSession[];
  } catch {
    return [];
  }
}

function persistChats(chats: ChatSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export function getChat(id: string): ChatSession | null {
  const chats = getAllChats();
  return chats.find((c) => c.id === id) ?? null;
}

export function saveChat(chat: ChatSession): void {
  const chats = getAllChats();
  const idx = chats.findIndex((c) => c.id === chat.id);
  const updated = { ...chat, updatedAt: Date.now() };
  if (idx >= 0) {
    chats[idx] = updated;
  } else {
    chats.push(updated);
  }
  persistChats(chats);
}

export function deleteChat(id: string): void {
  const chats = getAllChats().filter((c) => c.id !== id);
  persistChats(chats);
}

export function renameChat(id: string, name: string): void {
  const chats = getAllChats();
  const chat = chats.find((c) => c.id === id);
  if (chat) {
    chat.name = name;
    chat.updatedAt = Date.now();
    persistChats(chats);
  }
}

export function createChat(): ChatSession {
  return {
    id: crypto.randomUUID(),
    name: "New Chat",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function generateChatName(firstMessage: string): string {
  const cleaned = firstMessage.replace(/[^\w\s]/g, "").trim();
  if (cleaned.length <= 40) return cleaned;
  return cleaned.slice(0, 37) + "...";
}
