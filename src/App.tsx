import { useState, useEffect, useRef } from 'react'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { Header } from '@/components/Header'
import { Chat } from '@/components/Chat'
import { ChatSidebar } from '@/components/ChatSidebar'
import { getAllChats, saveChat, deleteChat, renameChat, createChat, generateChatName } from '@/lib/chatStorage'
import type { ChatSession, Message } from '@/lib/chatStorage'

function AppContent() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  const [primaryColor, setPrimaryColor] = useState(() => {
    const saved = localStorage.getItem('primary-color')
    return saved || '#3b82f6'
  })
  const [tempColor, setTempColor] = useState(() => {
    const saved = localStorage.getItem('primary-color')
    return saved || '#3b82f6'
  })

  const [chats, setChats] = useState<ChatSession[]>(() => getAllChats())
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const autoNamedRef = useRef(false)
  const touchStartX = useRef(0)

  useEffect(() => {
    if (chats.length > 0) {
      const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
      const mostRecent = sorted[0]
      setActiveChatId(mostRecent.id)
      setMessages(mostRecent.messages)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor)
  }, [primaryColor])

  const handleColorChange = (color: string) => setTempColor(color)

  const confirmColor = () => {
    setPrimaryColor(tempColor)
    localStorage.setItem('primary-color', tempColor)
  }

  const resetColor = () => {
    const defaultColor = isDark ? '#6366f1' : '#3b82f6'
    setTempColor(defaultColor)
    setPrimaryColor(defaultColor)
    localStorage.setItem('primary-color', defaultColor)
  }

  // Persist messages whenever they change
  useEffect(() => {
    // Auto-create a chat if messages arrive without an active chat
    if (!activeChatId) {
      if (messages.length === 0) return

      const userMsg = messages.find((m) => m.type === 'user')
      const name = userMsg ? generateChatName(userMsg.content) : 'New Chat'
      const newChat: ChatSession = { ...createChat(), name, messages, updatedAt: Date.now() }

      autoNamedRef.current = true
      saveChat(newChat)
      setChats((prev) => [...prev, newChat])
      setActiveChatId(newChat.id)
      return
    }

    const chat = chats.find((c) => c.id === activeChatId)
    if (!chat) return

    let name = chat.name

    if (!autoNamedRef.current) {
      const userMsg = messages.find((m) => m.type === 'user')
      if (userMsg && name === 'New Chat') {
        autoNamedRef.current = true
        name = generateChatName(userMsg.content)
        renameChat(activeChatId, name)
      }
    }

    saveChat({ ...chat, name, messages, updatedAt: Date.now() })

    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId ? { ...c, messages, name, updatedAt: Date.now() } : c
      )
    )
  }, [messages, activeChatId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNewChat = () => {
    if (activeChatId) {
      const chat = chats.find((c) => c.id === activeChatId)
      if (chat) {
        saveChat({ ...chat, messages, updatedAt: Date.now() })
      }
    }
    autoNamedRef.current = false
    const newChat = createChat()
    setChats((prev) => [...prev, newChat])
    setActiveChatId(newChat.id)
    setMessages([])
    setSidebarOpen(false)
  }

  const handleSelectChat = (id: string) => {
    if (id === activeChatId) {
      setSidebarOpen(false)
      return
    }
    // Save current chat
    if (activeChatId) {
      const chat = chats.find((c) => c.id === activeChatId)
      if (chat) {
        saveChat({ ...chat, messages, updatedAt: Date.now() })
      }
    }
    autoNamedRef.current = false
    const target = chats.find((c) => c.id === id)
    if (target) {
      setActiveChatId(id)
      setMessages(target.messages)
      setLoading(false)
    }
    setSidebarOpen(false)
  }

  const handleDeleteChat = (id: string) => {
    deleteChat(id)
    const updated = chats.filter((c) => c.id !== id)
    setChats(updated)
    if (id === activeChatId) {
      autoNamedRef.current = false
      if (updated.length > 0) {
        const next = [...updated].sort((a, b) => b.updatedAt - a.updatedAt)[0]
        setActiveChatId(next.id)
        setMessages(next.messages)
        setLoading(false)
      } else {
        setActiveChatId(null)
        setMessages([])
        setLoading(false)
      }
    }
  }

  const handleRenameChat = (id: string, name: string) => {
    renameChat(id, name)
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }

  const touchStartY = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    const absDx = Math.abs(deltaX)
    const absDy = Math.abs(deltaY)

    // Only handle horizontal swipes (more horizontal than vertical)
    if (absDx < absDy || absDx < 50) return

    if (sidebarOpen) {
      if (deltaX < -50) setSidebarOpen(false)
    } else {
      if (deltaX > 50) setSidebarOpen(true)
    }
  }

  return (
    <div
      className="h-screen flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Header
        darkMode={isDark}
        onToggleDarkMode={() => setTheme(isDark ? 'light' : 'dark')}
        tempColor={tempColor}
        onColorChange={handleColorChange}
        onConfirmColor={confirmColor}
        onResetColor={resetColor}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <ChatSidebar
          darkMode={isDark}
          chats={chats}
          activeChatId={activeChatId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
        />
        <Chat
          darkMode={isDark}
          messages={messages}
          setMessages={setMessages}
          loading={loading}
          setLoading={setLoading}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="personaquant-theme">
      <AppContent />
    </ThemeProvider>
  )
}

export default App
