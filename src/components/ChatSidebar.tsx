import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, X, Check } from "lucide-react";
import type { ChatSession } from "@/lib/chatStorage";

interface ChatSidebarProps {
  darkMode: boolean;
  chats: ChatSession[];
  activeChatId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, name: string) => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ChatItem({
  chat,
  isActive,
  darkMode,
  onSelect,
  onDelete,
  onRename,
}: {
  chat: ChatSession;
  isActive: boolean;
  darkMode: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== chat.name) {
      onRename(trimmed);
    } else {
      setRenameValue(chat.name);
    }
    setIsRenaming(false);
  };

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? darkMode
            ? "bg-neutral-700 text-white"
            : "bg-blue-50 text-blue-700"
          : darkMode
          ? "text-neutral-300 hover:bg-neutral-800"
          : "text-gray-700 hover:bg-gray-100"
      }`}
      onClick={() => {
        if (!isRenaming) onSelect();
      }}
    >
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameSubmit();
            if (e.key === "Escape") {
              setRenameValue(chat.name);
              setIsRenaming(false);
            }
          }}
          onBlur={handleRenameSubmit}
          className={`flex-1 text-sm bg-transparent border-b outline-none ${
            darkMode
              ? "border-blue-400 text-white"
              : "border-blue-500 text-gray-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{chat.name}</p>
          <p className={`text-xs mt-0.5 ${darkMode ? "text-neutral-500" : "text-gray-400"}`}>
            {formatRelativeTime(chat.updatedAt)}
          </p>
        </div>
      )}

      {!isRenaming && !showDeleteConfirm && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setRenameValue(chat.name);
              setIsRenaming(true);
            }}
            className={`p-1 rounded transition-colors ${
              darkMode
                ? "hover:bg-neutral-600 text-neutral-400 hover:text-white"
                : "hover:bg-gray-200 text-gray-400 hover:text-gray-700"
            }`}
            title="Rename"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className={`p-1 rounded transition-colors ${
              darkMode
                ? "hover:bg-red-900/50 text-neutral-400 hover:text-red-400"
                : "hover:bg-red-100 text-gray-400 hover:text-red-600"
            }`}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="flex items-center gap-1 text-xs" onClick={(e) => e.stopPropagation()}>
          <span className={darkMode ? "text-neutral-400" : "text-gray-500"}>Delete?</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setShowDeleteConfirm(false);
            }}
            className={`p-1 rounded ${
              darkMode
                ? "text-red-400 hover:bg-red-900/50"
                : "text-red-600 hover:bg-red-100"
            }`}
          >
            <Check size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(false);
            }}
            className={`p-1 rounded ${
              darkMode
                ? "text-neutral-400 hover:bg-neutral-600"
                : "text-gray-400 hover:bg-gray-200"
            }`}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  darkMode,
  chats,
  activeChatId,
  ready,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
}: {
  darkMode: boolean;
  chats: ChatSession[];
  activeChatId: string | null;
  ready: boolean;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, name: string) => void;
}) {
  return (
    <>
      <div className={`flex items-center justify-between px-4 h-16 border-b flex-shrink-0 ${
        darkMode ? "border-neutral-700" : "border-gray-200"
      }`}>
        <h2 className={`text-sm font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
          Chats
        </h2>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out hover:scale-105 active:scale-95 bg-[var(--primary)] hover:brightness-110 text-white"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.length === 0 ? (
          <p className={`text-sm text-center mt-8 transition-opacity duration-500 ease-in-out ${
            ready ? "opacity-100" : "opacity-0"
          } ${darkMode ? "text-neutral-500" : "text-gray-400"}`}>
            No chats yet
          </p>
        ) : (
          [...chats]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((chat, index) => (
              <div
                key={chat.id}
                className={`transition-all duration-500 ease-out ${
                  ready
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4"
                }`}
                style={{
                  transitionDelay: `${Math.min(index * 40, 240)}ms`,
                }}
              >
                <ChatItem
                  chat={chat}
                  isActive={chat.id === activeChatId}
                  darkMode={darkMode}
                  onSelect={() => onSelectChat(chat.id)}
                  onDelete={() => onDeleteChat(chat.id)}
                  onRename={(name) => onRenameChat(chat.id, name)}
                />
              </div>
            ))
        )}
      </div>
    </>
  );
}

export function ChatSidebar({
  darkMode,
  chats,
  activeChatId,
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
}: ChatSidebarProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const id = setTimeout(() => setReady(true), 350)
      return () => clearTimeout(id)
    } else {
      setReady(false)
    }
  }, [isOpen])

  const sidebarClasses = darkMode
    ? "bg-neutral-900 border-neutral-700"
    : "bg-white border-gray-200"

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Mobile sidebar: fixed overlay below header */}
      <aside
        className={`md:hidden fixed left-0 top-16 bottom-0 w-72 z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none"
        } ${sidebarClasses} border-r`}
      >
        <SidebarContent
          darkMode={darkMode}
          chats={chats}
          activeChatId={activeChatId}
          ready={ready}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          onRenameChat={onRenameChat}
        />
      </aside>

      {/* Desktop sidebar: in-flow */}
      <aside
        className={`hidden md:flex flex-col border-r transition-all duration-300 ease-out flex-shrink-0 overflow-hidden ${
          isOpen ? "w-72 border-r" : "w-0 border-r-0"
        } ${sidebarClasses}`}
      >
        <SidebarContent
          darkMode={darkMode}
          chats={chats}
          activeChatId={activeChatId}
          ready={ready}
          onNewChat={onNewChat}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
          onRenameChat={onRenameChat}
        />
      </aside>
    </>
  );
}
