import { useState, useEffect } from 'react'
import { ThemeProvider, useTheme } from '@/components/theme-provider'
import { Header } from '@/components/Header'
import { Chat } from '@/components/Chat'

// Main application content component
function AppContent() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'
  
  // Theme color management
  const [primaryColor, setPrimaryColor] = useState(() => {
    const saved = localStorage.getItem('primary-color')
    return saved || '#3b82f6'
  })
  const [tempColor, setTempColor] = useState(() => {
    const saved = localStorage.getItem('primary-color')
    return saved || '#3b82f6'
  })

  // Apply primary color to CSS custom property
  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor)
  }, [primaryColor])

  // Color picker handlers
  const handleColorChange = (color: string) => {
    setTempColor(color)
  }

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

  return (
    <div className="h-screen flex flex-col">
      <Header 
        darkMode={isDark} 
        onToggleDarkMode={() => setTheme(isDark ? 'light' : 'dark')}
        tempColor={tempColor}
        onColorChange={handleColorChange}
        onConfirmColor={confirmColor}
        onResetColor={resetColor}
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