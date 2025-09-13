import { Send } from 'lucide-react'

interface ChatProps {
  darkMode: boolean
}

export function Chat({ darkMode }: ChatProps) {
  return (
    <div className={`flex-1 flex flex-col ${
      darkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Welcome message */}
          <div className="text-center py-8">
            <h3 className={`text-xl font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Welcome to PersonaQuant
            </h3>
            <p className={`${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Start a conversation with our AI agents for quantitative analysis
            </p>
          </div>
        </div>
      </div>

      {/* Chat input area */}
      <div className={`border-t p-4 ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              className={`px-4 py-3 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}