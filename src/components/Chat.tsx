import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

interface AgentCard {
  id: string
  title: string
  content: string
  tools?: { name: string; startTime?: number; duration?: number }[]
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
  type?: 'user' | 'ai-processing' | 'ai-response'
  cards?: AgentCard[]
  finalCard?: { title: string; content: string; tickers?: string[] }
}

interface ChatProps {
  darkMode: boolean
}

export function Chat({ darkMode }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [, forceUpdate] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Timer to update running tool times
  useEffect(() => {
    const interval = setInterval(() => {
      if (isTyping) {
        forceUpdate(prev => prev + 1)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [isTyping])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = () => {
    if (!inputValue.trim() || isTyping) return

    const userInput = inputValue
    const newMessage: Message = {
      id: Date.now().toString(),
      content: userInput,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setIsTyping(true)
    
    // Keep input focused
    inputRef.current?.focus()

    // Send message to backend API
    try {
      const eventSource = new EventSource(
        `http://localhost:8000/api/chat?prompt=${encodeURIComponent(userInput)}`
      )

      let responseContent = ''
      let currentCards: AgentCard[] = []

      // Handle team-level tool events (delegation)
      eventSource.addEventListener('tool', (event) => {
        const data = JSON.parse(event.data)

        if (data.event === 'TeamToolCallStarted') {
          const toolName = data.payload?.tool?.tool_name
          const memberId = data.payload?.tool?.tool_args?.member_id
          const taskDescription = data.payload?.tool?.tool_args?.task_description

          if (toolName === 'delegate_task_to_member' && memberId) {
            let title = ''
            if (memberId === 'agent-1') title = 'Finance Agent'
            else if (memberId === 'agent-2') title = 'Sentiment Agent'
            else if (memberId === 'agent-3') title = 'Advisory Agent'
            else if (memberId === 'agent-4') title = 'Search Agent'

            if (title) {
              const newCard: AgentCard = {
                id: `card-${memberId}-${Date.now()}`,
                title: title,
                content: '',
                tools: []
              }
              currentCards = [...currentCards, newCard]
            }
          }
        }

        if (data.event === 'TeamToolCallCompleted') {
          const toolName = data.payload?.tool?.tool_name
          const result = data.payload?.tool?.result
          const memberId = data.payload?.tool?.tool_args?.member_id

          if (toolName === 'delegate_task_to_member' && result && memberId) {
            const memberCards = currentCards.filter(card => card.id.includes(memberId))
            const latestMemberCard = memberCards[memberCards.length - 1]

            currentCards = currentCards.map(card => 
              card.id === latestMemberCard?.id
                ? { ...card, content: result }
                : card
            )
          }
        }
      })

      // Handle individual agent tool events
      const handleAgentTool = (event: MessageEvent, agentTitle: string) => {
        const data = JSON.parse(event.data)
        const toolName = data.payload?.tool?.tool_name
        const agentName = data.payload?.agent_name

        if (data.event === 'ToolCallStarted' && toolName && agentName) {
          const agentCards = currentCards.filter(card => card.title === agentTitle)
          const latestCard = agentCards[agentCards.length - 1]

          if (latestCard) {
            currentCards = currentCards.map(card => 
              card.id === latestCard.id
                ? { ...card, tools: [...(card.tools || []), { name: toolName, startTime: Date.now() }] }
                : card
            )
          }
        }

        if (data.event === 'ToolCallCompleted' && toolName && agentName) {
          const agentCards = currentCards.filter(card => card.title === agentTitle)
          const latestCard = agentCards[agentCards.length - 1]
          const duration = data.payload?.tool?.metrics?.duration

          if (latestCard) {
            currentCards = currentCards.map(card => {
              if (card.id === latestCard.id) {
                const updatedTools = card.tools?.map(tool => 
                  tool.name === toolName && !tool.duration
                    ? { ...tool, duration }
                    : tool
                ) || []
                return { ...card, tools: updatedTools }
              }
              return card
            })
          }
        }
      }

      eventSource.addEventListener('tool-finance', (event) => {
        handleAgentTool(event, 'Finance Agent')
      })

      eventSource.addEventListener('tool-sentiment', (event) => {
        handleAgentTool(event, 'Sentiment Agent')
      })

      eventSource.addEventListener('tool-advisory', (event) => {
        handleAgentTool(event, 'Advisory Agent')
      })

      eventSource.addEventListener('tool-search', (event) => {
        handleAgentTool(event, 'Search Agent')
      })

      eventSource.addEventListener('run', (event) => {
        const data = JSON.parse(event.data)
        
        if (data.event === 'TeamRunCompleted') {
          setIsTyping(false)
          responseContent = data.payload?.content || 'No response received'
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: '',
            sender: 'assistant',
            timestamp: new Date(),
            type: 'ai-response',
            cards: currentCards,
            finalCard: { title: 'Conductor', content: responseContent }
          }
          setMessages(prev => [...prev, aiResponse])
          eventSource.close()
        }
      })

      eventSource.addEventListener('error', () => {
        setIsTyping(false)
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: 'Sorry, I encountered an error while processing your request. Please try again.',
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorResponse])
        eventSource.close()
      })

      eventSource.addEventListener('end', () => {
        setIsTyping(false)
        eventSource.close()
      })
    } catch (error) {
      setIsTyping(false)
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Failed to connect to the AI service. Please check your connection and try again.',
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTyping) {
      handleSendMessage()
    }
  }

  // Custom markdown components for consistent styling
  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className={`text-base font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className={`mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className={`mb-2 ml-4 space-y-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal list-inside mb-2 ml-4 space-y-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} flex items-start`}>
        <span className="mr-2 font-bold text-lg">•</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }: any) => (
      <strong className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em className={`italic ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {children}
      </em>
    ),
    code: ({ children }: any) => (
      <code className={`px-1 py-0.5 rounded text-xs font-mono ${
        darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
      }`}>
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre className={`p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2 ${
        darkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-800'
      }`}>
        {children}
      </pre>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className={`border-l-4 pl-4 italic mb-2 ${
        darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-300 text-gray-600'
      }`}>
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <table className={`min-w-full mb-4 border-collapse ${
        darkMode ? 'border-gray-600' : 'border-gray-300'
      }`}>
        {children}
      </table>
    ),
    thead: ({ children }: any) => (
      <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => (
      <tr className={`border-b ${
        darkMode ? 'border-gray-600' : 'border-gray-300'
      }`}>
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className={`px-3 py-2 text-left font-semibold ${
        darkMode ? 'text-white border-gray-600' : 'text-gray-900 border-gray-300'
      } border`}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className={`px-3 py-2 ${
        darkMode ? 'text-gray-200 border-gray-600' : 'text-gray-800 border-gray-300'
      } border`}>
        {children}
      </td>
    ),
    hr: () => (
      <hr className={`my-3 ${
        darkMode ? 'border-gray-600' : 'border-gray-300'
      }`} />
    ),
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cardId)) {
        newSet.delete(cardId)
      } else {
        newSet.add(cardId)
      }
      return newSet
    })
  }

  // Render agent cards
  const renderCards = (cards: AgentCard[]) =>
    cards?.map((card) => {
      const isExpanded = expandedCards.has(card.id)
      return (
        <div
          key={card.id}
          className={`border rounded-lg ${
            darkMode
              ? 'border-gray-600 bg-gray-800'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div
            className={`p-3 cursor-pointer flex items-center justify-between ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}
            onClick={() => toggleCardExpansion(card.id)}
          >
            <span className={`font-medium ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {card.title}
            </span>
            {isExpanded ? (
              <ChevronUp size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            ) : (
              <ChevronDown size={16} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            )}
          </div>
          {isExpanded && (
            <div className={`p-3 border-t ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              {card.tools && card.tools.length > 0 && (
                <div className="mb-3">
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Tools Used:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {card.tools.map((tool, idx) => {
                      const getTime = () => {
                        if (tool.duration) {
                          return `${tool.duration.toFixed(1)}s`
                        } else if (tool.startTime) {
                          const elapsed = (Date.now() - tool.startTime) / 1000
                          return `${elapsed.toFixed(1)}s`
                        }
                        return '0.0s'
                      }

                      return (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                            darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span>{tool.name}</span>
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {getTime()}
                          </span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className={`text-sm ${
                darkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={markdownComponents}
                >
                  {card.content.replace(/\n/g, '  \n')}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      )
    })

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
            messages.map((message, i) => {
              const isUser = message.sender === 'user'
              const isAiResponse = message.type === 'ai-response'

              if (isAiResponse) {
                return (
                  <div key={message.id} className="flex justify-start">
                    <div className="w-full max-w-[90%] space-y-3">
                      {renderCards(message.cards || [])}

                      {message.finalCard && (
                        <div
                          className={`border rounded-lg ${
                            darkMode
                              ? 'border-gray-600 bg-gray-800'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div
                            className={`p-3 font-medium ${
                              darkMode ? 'text-white bg-gray-700' : 'text-gray-900 bg-gray-100'
                            }`}
                          >
                            {message.finalCard.title}
                          </div>
                          <div
                            className={`px-3 py-3 border-t ${
                              darkMode ? 'border-gray-600' : 'border-gray-200'
                            }`}
                          >
                            <div
                              className={`text-sm ${
                                darkMode ? 'text-gray-200' : 'text-gray-800'
                              }`}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkBreaks]}
                                components={markdownComponents}
                              >
                                {message.finalCard.content.replace(/\n/g, '  \n')}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={message.id}
                  className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                      isUser
                        ? 'text-white'
                        : darkMode
                        ? 'bg-gray-700 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                    style={isUser ? { backgroundColor: 'var(--primary)' } : {}}
                  >
                    {isUser ? (
                      <p className="text-sm">{message.content}</p>
                    ) : (
                      <div className={`prose prose-sm max-w-none ${
                        darkMode ? 'prose-invert' : ''
                      }`}>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={markdownComponents}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300">
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
          
          {/* Invisible div for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input area */}
      <div className={`border-t p-4 ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              ref={inputRef}
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
              className={`px-4 py-3 rounded-lg transition-all duration-200 text-white hover:scale-105 active:scale-95 ${
                isTyping || !inputValue.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'hover:opacity-90'
              }`}
              style={!isTyping && inputValue.trim() ? { backgroundColor: 'var(--primary)' } : {}}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>


    </div>
  )
}