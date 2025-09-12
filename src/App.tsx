import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { Header } from '@/components/Header'

// Main application content component
function AppContent() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <Header 
        darkMode={isDark} 
        onToggleDarkMode={() => setTheme(isDark ? 'light' : 'dark')}
      />
      
      <main className={`flex-1 p-4 ${
        isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="text-center mt-8">
          <h2 className={`text-3xl font-bold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Multi-agent AI system for quantitative analysis
          </h2>
          <p className={`${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Welcome to PersonaQuant - Your intelligent trading companion
          </p>
        </div>
      </main>
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