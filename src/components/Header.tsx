import { Sun, Moon } from 'lucide-react'

// Props interface for Header component
interface HeaderProps {
  darkMode: boolean
  onToggleDarkMode: () => void
}

// Main header component with branding and controls
export function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className={`h-16 px-6 flex items-center justify-between border-b ${
      darkMode ? 'bg-gray-950 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
    }`}>
      <h1 className="text-xl font-semibold">PersonaQuant</h1>
      
      <button
        onClick={onToggleDarkMode}
        className={`p-2 rounded-lg transition-all duration-200 ease-out hover:scale-110 active:scale-95 ${
          darkMode 
            ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  )
}