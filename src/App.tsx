import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { Header } from '@/components/Header'
import { Chat } from '@/components/Chat'

// Main application content component
function AppContent() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="h-screen flex flex-col">
      <Header 
        darkMode={isDark} 
        onToggleDarkMode={() => setTheme(isDark ? 'light' : 'dark')}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <Chat darkMode={isDark} />
      </div>
    </div>
  )
}

// Root App component with theme provider
function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="personaquant-theme">
      <AppContent />
    </ThemeProvider>
  )
}

export default App