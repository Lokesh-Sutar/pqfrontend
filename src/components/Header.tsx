import { Sun, Moon } from "lucide-react";
import { ColorPicker } from "./ColorPicker";

// Props interface for Header component
interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  tempColor: string;
  onColorChange: (color: string) => void;
  onConfirmColor: () => void;
  onResetColor: () => void;
}

// Main header component with branding and controls
export function Header({
  darkMode,
  onToggleDarkMode,
  tempColor,
  onColorChange,
  onConfirmColor,
  onResetColor,
}: HeaderProps) {
  return (
    <header
      className={`h-16 px-6 flex items-center justify-between border-b ${
        darkMode
          ? "bg-neutral-950 border-neutral-700 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}
    >
      {/* Left side - Logo and branding */}
      <div className="flex items-center gap-3">
        <img src="/icon.png" alt="PersonaQuant" className="w-8 h-8" />
        <img
          src={darkMode ? "/name_for_dark.png" : "/name_for_light.png"}
          alt="PersonaQuant"
          className="h-5 md:h-6"
        />
      </div>

      {/* Right side - Controls */}
      <div className="flex items-center gap-3">
        {/* Color picker for theme customization */}
        <ColorPicker
          color={tempColor}
          onChange={onColorChange}
          onConfirm={onConfirmColor}
          onReset={onResetColor}
          darkMode={darkMode}
        />

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-lg transition-all duration-200 ease-out hover:scale-110 active:scale-95 ${
            darkMode
              ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
