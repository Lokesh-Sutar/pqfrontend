import { useState } from 'react'
import { Send, User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

interface ChatProps {
  darkMode: boolean
}

export function Chat({ darkMode }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsTyping(true)

    // Simulate AI response with typing indicator
    setTimeout(() => {
      setIsTyping(false)
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `Thank you for your message: "${inputValue}"

I'm **PersonaQuant**, here to help with:
- Stock analysis
- Portfolio optimization
- Risk assessment
- Market insights

How can I assist you today?`,
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTyping) {
      handleSendMessage()
    }
  }

  return (
    <div className={`flex-1 flex flex-col ${
      darkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            /* Welcome message */
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
          ) : (
            /* Messages */
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300 ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.sender === 'assistant' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-blue-600' : 'bg-blue-500'
                  }`}>
                    <Bot size={16} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                    message.sender === 'user'
                      ? darkMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : darkMode
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <p className="text-sm">{message.content}</p>
                  ) : (
                    <div className={`prose prose-sm max-w-none ${
                      darkMode ? 'prose-invert' : ''
                    }`}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className={`mb-2 last:mb-0 ml-4 space-y-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{children}</ul>,
                          ol: ({ children }) => <ol className={`list-decimal list-inside mb-2 last:mb-0 ml-4 space-y-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{children}</ol>,
                          li: ({ children }) => <li className={`${darkMode ? 'text-white' : 'text-gray-800'} flex items-start`}><span className="mr-2 font-bold text-lg">•</span><span className="flex-1">{children}</span></li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          code: ({ children }) => <code className={`px-1 py-0.5 rounded text-xs ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>{children}</code>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    darkMode ? 'bg-gray-600' : 'bg-gray-400'
                  }`}>
                    <User size={16} className="text-white" />
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start animate-in slide-in-from-bottom-2 duration-300">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-blue-600' : 'bg-blue-500'
              }`}>
                <Bot size={16} className="text-white" />
              </div>
              <div className={`px-4 py-3 rounded-lg ${
                darkMode ? 'bg-gray-700' : 'bg-gray-200'
              }`}>
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-gray-400' : 'bg-gray-500'
                  }`} style={{ animationDelay: '0ms' }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-gray-400' : 'bg-gray-500'
                  }`} style={{ animationDelay: '150ms' }}></div>
                  <div className={`w-2 h-2 rounded-full animate-bounce ${
                    darkMode ? 'bg-gray-400' : 'bg-gray-500'
                  }`} style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              onClick={handleSendMessage}
              disabled={isTyping || !inputValue.trim()}
              className={`px-4 py-3 rounded-lg transition-all duration-200 ${
                isTyping || !inputValue.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : darkMode
                  ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105 active:scale-95'
              } text-white`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}