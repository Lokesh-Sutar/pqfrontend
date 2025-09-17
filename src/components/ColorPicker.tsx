import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Palette, Check, RotateCcw } from 'lucide-react'

// Props interface for ColorPicker component
interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
  onConfirm: () => void
  onReset: () => void
  darkMode: boolean
}

// Color picker component with popover interface
export function ColorPicker({ color, onChange, onConfirm, onReset, darkMode }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={popoverRef}>
      {/* Color picker trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg cursor-pointer transition-all duration-200 ease-out hover:scale-110 active:scale-95"
        style={{ backgroundColor: color }}
        title="Primary Color"
      >
        <Palette size={16} className="text-white" />
      </button>
      
      {/* Color picker popover */}
      {isOpen && (
        <div className={`absolute top-12 right-0 p-3 rounded-lg shadow-lg border z-50 ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          {/* Color picker widget */}
          <HexColorPicker color={color} onChange={onChange} />
          
          {/* Action buttons */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { onConfirm(); setIsOpen(false); }}
              className="flex-1 py-1 px-2 text-sm rounded bg-green-500 text-white hover:bg-green-600 transition-all duration-200 ease-out hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <Check size={20} />
            </button>
            <button
              onClick={() => { onReset(); setIsOpen(false); }}
              className="flex-1 py-1 px-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-all duration-200 ease-out hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}