import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMoneyBillTrendUp,
  faPeopleGroup,
  faUserTie,
  faMagnifyingGlass,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons'

// Props interface for Chat component
interface ChatProps {
  darkMode: boolean;
  onMessageSent?: () => void;
  onToolsCompleted?: () => void;
}

interface AgentCard {
  id: string;
  runId: string;
  title: string;
  tools: {
    name: string;
    duration?: number;
    startTime?: number;
    args?: any;
    result?: any;
  }[];
  content: string;
  taskDescription?: string;
  startTime?: number;
  totalDuration?: number;
}

interface ToolDetails {
  name: string;
  args?: any;
  result?: any;
  duration?: number;
  agent: string;
}

interface Message {
  type: "user" | "ai-processing" | "ai-response";
  content: string;
  cards?: AgentCard[];
  finalCard?: { title: string; content: string; tickers?: string[] };
  tickers?: string[];
}

export function Chat({ darkMode, onMessageSent, onToolsCompleted }: ChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<{
    [key: string]: boolean;
  }>({});
  const [selectedTool, setSelectedTool] = useState<ToolDetails | null>(null);
  const [, forceUpdate] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);


  // Timer to update running tool times
  useEffect(() => {
    const interval = setInterval(() => {
      if (loading) {
        forceUpdate(prev => prev + 1)
      }
    }, 100) // Update every 100ms
    return () => clearInterval(interval)
  }, [loading])

  // ESC key to close popup
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTool) {
        setSelectedTool(null)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [selectedTool])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [
      ...prev,
      { type: "user", content: userMessage },
      { type: "ai-processing", content: "", cards: [] },
    ]);
    setInput("");
    setLoading(true);



    onMessageSent?.();

    // Send message to backend API
    try {
      const eventSource = new EventSource(
        `http://localhost:8000/api/chat?prompt=${encodeURIComponent(userMessage)}`
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
                runId: `run-${Date.now()}`,
                title: title,
                content: '',
                tools: [],
                taskDescription: taskDescription || '',
                startTime: Date.now()
              }
              currentCards = [...currentCards, newCard]
              
              // Auto-expand processing cards
              setExpandedCards(prev => ({ ...prev, [newCard.id]: true }))
              
              // Update messages immediately to show live processing
              setMessages(prev => {
                const lastMsg = prev[prev.length - 1]
                if (lastMsg && lastMsg.type === 'ai-processing') {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, cards: currentCards }
                  ]
                } else {
                  return [
                    ...prev,
                    { 
                      id: (Date.now() + 2).toString(),
                      content: '',
                      sender: 'assistant' as const,
                      timestamp: new Date(),
                      type: 'ai-processing' as const,
                      cards: currentCards
                    }
                  ]
                }
              })
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

            currentCards = currentCards.map(card => {
              if (card.id === latestMemberCard?.id) {
                const totalDuration = card.startTime
                  ? (Date.now() - card.startTime) / 1000
                  : undefined
                return {
                  ...card,
                  content: result,
                  taskDescription: undefined,
                  totalDuration
                }
              }
              return card
            })
            
            // Update messages immediately to show live updates
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1]
              if (lastMsg && lastMsg.type === 'ai-processing') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, cards: currentCards }
                ]
              }
              return prev
            })
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
          const toolArgs = data.payload?.tool?.tool_args

          if (latestCard) {
            currentCards = currentCards.map(card => 
              card.id === latestCard.id
                ? { ...card, tools: [...(card.tools || []), { name: toolName, startTime: Date.now(), args: toolArgs }] }
                : card
            )
            
            // Update messages immediately to show live tool execution
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1]
              if (lastMsg && lastMsg.type === 'ai-processing') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, cards: currentCards }
                ]
              }
              return prev
            })
          }
        }

        if (data.event === 'ToolCallCompleted' && toolName && agentName) {
          const agentCards = currentCards.filter(card => card.title === agentTitle)
          const latestCard = agentCards[agentCards.length - 1]
          const duration = data.payload?.tool?.metrics?.duration
          const result = data.payload?.tool?.result

          if (latestCard) {
            currentCards = currentCards.map(card => {
              if (card.id === latestCard.id) {
                const updatedTools = card.tools?.map(tool => 
                  tool.name === toolName && !tool.duration
                    ? { ...tool, duration, result }
                    : tool
                ) || []
                return { ...card, tools: updatedTools }
              }
              return card
            })
            
            // Update messages immediately to show live tool completion
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1]
              if (lastMsg && lastMsg.type === 'ai-processing') {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, cards: currentCards }
                ]
              }
              return prev
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
          setLoading(false)
          responseContent = data.payload?.content || 'No response received'
          
          // Close processing cards when completed
          setExpandedCards(prev => {
            const newState = { ...prev }
            currentCards.forEach(card => {
              delete newState[card.id]
            })
            return newState
          })
          
          const aiResponse: Message = {
            type: 'ai-response',
            content: '',
            cards: currentCards,
            finalCard: { title: 'Conductor', content: responseContent }
          }
          setMessages(prev => [...prev, aiResponse])
          onToolsCompleted?.()
          eventSource.close()
        }
      })

      eventSource.addEventListener('error', () => {
        setLoading(false)
        eventSource.close()
      })

      eventSource.addEventListener('end', () => {
        setLoading(false)
        eventSource.close()
      })
    } catch (error) {
      console.error('Failed to create EventSource:', error)
      setLoading(false)
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
      <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className={`mb-2 ${darkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul className={`mb-2 ml-4 space-y-1 ${darkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className={`list-decimal list-inside mb-2 ml-4 space-y-1 ${darkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className={`${darkMode ? 'text-neutral-200' : 'text-gray-800'} flex items-start`}>
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
      <em className={`italic ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
        {children}
      </em>
    ),
    code: ({ children }: any) => (
      <code className={`px-1 py-0.5 rounded text-xs font-mono ${
        darkMode ? 'bg-neutral-600 text-neutral-200' : 'bg-gray-200 text-gray-800'
      }`}>
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre className={`p-3 rounded-lg overflow-x-auto text-sm font-mono mb-2 ${
        darkMode ? 'bg-neutral-600 text-neutral-200' : 'bg-gray-200 text-gray-800'
      }`}>
        {children}
      </pre>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className={`border-l-4 pl-4 italic mb-2 ${
        darkMode ? 'border-neutral-600 text-neutral-300' : 'border-gray-300 text-gray-600'
      }`}>
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <table className={`min-w-full mb-4 border-collapse ${
        darkMode ? 'border-neutral-600' : 'border-gray-300'
      }`}>
        {children}
      </table>
    ),
    thead: ({ children }: any) => (
      <thead className={`${darkMode ? 'bg-neutral-700' : 'bg-gray-100'}`}>
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => (
      <tr className={`border-b ${
        darkMode ? 'border-neutral-600' : 'border-gray-300'
      }`}>
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className={`px-3 py-2 text-left font-semibold ${
        darkMode ? 'text-white border-neutral-600' : 'text-gray-900 border-gray-300'
      } border`}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className={`px-3 py-2 ${
        darkMode ? 'text-neutral-200 border-neutral-600' : 'text-gray-800 border-gray-300'
      } border`}>
        {children}
      </td>
    ),
    hr: () => (
      <hr className={`my-3 ${
        darkMode ? 'border-neutral-600' : 'border-gray-300'
      }`} />
    ),
  }

  const toggleCardExpansion = (cardId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }))
  }

  // Render agent cards
  const renderCards = (cards: AgentCard[]) =>
    cards?.map((card) => {
      const isExpanded = expandedCards[card.id]
      return (
        <div
          key={card.id}
          className={`border rounded-lg ${
            darkMode
              ? 'border-neutral-600 bg-neutral-800'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div
            className={`p-3 cursor-pointer flex items-center justify-between rounded-t-lg ${
              card.title === 'Finance Agent'
                ? darkMode
                  ? 'bg-green-900/30 hover:bg-green-800/40'
                  : 'bg-green-100/50 hover:bg-green-200/60'
                : card.title === 'Sentiment Agent'
                ? darkMode
                  ? 'bg-orange-900/30 hover:bg-orange-800/40'
                  : 'bg-orange-100/50 hover:bg-orange-200/60'
                : card.title === 'Advisory Agent'
                ? darkMode
                  ? 'bg-blue-900/30 hover:bg-blue-800/40'
                  : 'bg-blue-100/50 hover:bg-blue-200/60'
                : card.title === 'Search Agent'
                ? darkMode
                  ? 'bg-neutral-700/30 hover:bg-neutral-600/40'
                  : 'bg-gray-200/50 hover:bg-gray-300/60'
                : darkMode
                ? 'bg-neutral-700' : 'bg-gray-100'
            }`}
            onClick={() => toggleCardExpansion(card.id)}
          >
            <div className="flex items-center gap-2">
              {card.title === 'Finance Agent' && (
                <FontAwesomeIcon
                  icon={faMoneyBillTrendUp}
                  className={`${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  } ${!card.content ? 'animate-pulse' : ''}`}
                />
              )}
              {card.title === 'Sentiment Agent' && (
                <FontAwesomeIcon
                  icon={faPeopleGroup}
                  className={`${
                    darkMode ? 'text-orange-400' : 'text-orange-600'
                  } ${!card.content ? 'animate-pulse' : ''}`}
                />
              )}
              {card.title === 'Advisory Agent' && (
                <FontAwesomeIcon
                  icon={faUserTie}
                  className={`${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  } ${!card.content ? 'animate-pulse' : ''}`}
                />
              )}
              {card.title === 'Search Agent' && (
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className={`${
                    darkMode ? 'text-gray-300' : 'text-gray-800'
                  } ${!card.content ? 'animate-pulse' : ''}`}
                />
              )}
              <span className={`font-medium ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {card.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  card.title === 'Finance Agent'
                    ? darkMode
                      ? 'bg-green-900 text-green-300'
                      : 'bg-green-200 text-green-800'
                    : card.title === 'Sentiment Agent'
                    ? darkMode
                      ? 'bg-orange-900 text-orange-300'
                      : 'bg-orange-200 text-orange-800'
                    : card.title === 'Advisory Agent'
                    ? darkMode
                      ? 'bg-blue-900 text-blue-300'
                      : 'bg-blue-200 text-blue-800'
                    : card.title === 'Search Agent'
                    ? darkMode
                      ? 'bg-neutral-700 text-neutral-300'
                      : 'bg-gray-300 text-gray-800'
                    : darkMode
                    ? 'bg-neutral-700 text-neutral-200'
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {card.totalDuration
                  ? `${card.totalDuration.toFixed(1)}s`
                  : card.startTime
                  ? `${((Date.now() - card.startTime) / 1000).toFixed(1)}s`
                  : '0.0s'}
              </span>
              {isExpanded ? (
                <ChevronUp size={16} />
              ) : (
                <ChevronDown size={16} />
              )}
            </div>
          </div>
          {isExpanded && (
            <div className={`p-3 border-t ${
              darkMode ? 'border-neutral-600' : 'border-gray-200'
            }`}>
              {card.tools && card.tools.length > 0 && (
                <div className="mb-3">
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                    Tools Used:
                  </div>
                  <div className="space-y-1">
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
                        <div
                          key={idx}
                          className={`text-sm px-2 py-1 rounded flex justify-between items-center cursor-pointer hover:opacity-80 hover:scale-102 transition-transform duration-200 ${
                            darkMode ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-100 text-gray-700'
                          }`}
                          onClick={() => setSelectedTool({
                            name: tool.name,
                            duration: tool.duration,
                            startTime: tool.startTime,
                            args: tool.args,
                            result: tool.result,
                            agent: card.title
                          })}
                        >
                          <span>{tool.name}</span>
                          <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                            {getTime()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className={`text-sm ${
                darkMode ? 'text-neutral-200' : 'text-gray-800'
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
      darkMode ? 'bg-neutral-900' : 'bg-white'
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
              const isUser = message.type === 'user'
              const isAiResponse = message.type === 'ai-response'
              const isProcessing = message.type === 'ai-processing'

              if (isProcessing && i === messages.length - 1) {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="w-full max-w-[90%] space-y-3">
                      {renderCards(message.cards || [])}
                    </div>
                  </div>
                )
              }

              if (isAiResponse) {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="w-full max-w-[90%] space-y-3">
                      {renderCards(message.cards || [])}

                      {message.finalCard && (
                        <div
                          className={`border rounded-lg ${
                            darkMode
                              ? 'border-gray-600 bg-neutral-800'
                              : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div
                            className={`p-3 font-medium rounded-t-lg ${
                              darkMode
                                ? 'text-white bg-yellow-900/30'
                                : 'text-gray-900 bg-yellow-100/50'
                            } flex items-center gap-2`}
                          >
                            <FontAwesomeIcon
                              icon={faClipboardList}
                              className={`${
                                darkMode ? 'text-yellow-400' : 'text-yellow-600'
                              }`}
                            />
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

              if (isProcessing || !message.content.trim()) {
                return null
              }

              return (
                <div
                  key={i}
                  className={`flex animate-in slide-in-from-bottom-2 duration-300 ${
                    isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-2xl px-4 py-3 rounded-lg ${
                      isUser
                        ? 'text-white'
                        : darkMode
                        ? 'bg-neutral-700 text-white'
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
          
          {/* Loading indicator */}
          {loading && messages.length > 0 && messages[messages.length - 1]?.type !== 'ai-response' && (
            <div className="flex justify-start">
              <div className={`p-4 rounded-2xl ${
                darkMode ? 'bg-neutral-800 text-white' : 'bg-gray-100 text-gray-900'
              }`}>
                <span className="inline-flex">
                  {'Working...'.split('').map((char, i) => (
                    <span
                      key={i}
                      className="animate-pulse"
                      style={{ animationDelay: `${i * 0.1}s` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          )}
          
          {/* Invisible div for auto-scroll */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat input area */}
      <div className={`border-t p-4 ${
        darkMode ? 'border-neutral-700 bg-neutral-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Type your message..."
              className={`flex-1 px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                darkMode 
                  ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`px-4 py-3 rounded-lg transition-all duration-200 text-white hover:scale-105 active:scale-95 ${
                loading || !input.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'hover:opacity-90'
              }`}
              style={!loading && input.trim() ? { backgroundColor: 'var(--primary)' } : {}}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Tool details popup */}
      {selectedTool && (
        <div
          className="fixed inset-0 bg-transparent flex items-center justify-center z-50"
          onClick={() => setSelectedTool(null)}
        >
          <div
            className={`w-[80%] h-[80%] rounded-xl shadow-2xl ${
              darkMode ? 'bg-neutral-800 border-neutral-600' : 'bg-white border-gray-200'
            } border-2 flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-6 border-b ${
              darkMode ? 'border-neutral-600' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Tool Details
              </h3>
              <button
                onClick={() => setSelectedTool(null)}
                className={`p-2 rounded hover:bg-opacity-80 ${
                  darkMode ? 'hover:bg-neutral-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={24} className={darkMode ? 'text-neutral-400' : 'text-gray-600'} />
              </button>
            </div>
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <div className="grid grid-cols-8 gap-6">
                <div className="col-span-2">
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Name:
                  </label>
                  <p className={`mt-2 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {selectedTool.name}
                  </p>
                </div>
                <div className="col-span-1">
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status:
                  </label>
                  <p className={`mt-2 text-lg font-semibold ${
                    selectedTool.duration
                      ? darkMode ? 'text-green-400' : 'text-green-600'
                      : darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  }`}>
                    {selectedTool.duration ? 'Completed' : 'Running'}
                  </p>
                </div>
                {selectedTool.duration && (
                  <div className="col-span-1">
                    <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Duration:
                    </label>
                    <p className={`mt-2 text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {selectedTool.duration.toFixed(4)}s
                    </p>
                  </div>
                )}
                {selectedTool.args && (
                  <div className="col-span-4">
                    <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                      Arguments:
                    </label>
                    <div className={`mt-2 p-3 rounded-lg text-sm ${
                      darkMode ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-100 text-gray-800'
                    }`}>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(selectedTool.args, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
              {selectedTool.result && (
                <div className="mt-6 flex flex-col gap-2 overflow-hidden">
                  <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                    Result:
                  </label>
                  <div className={`p-4 rounded-lg overflow-y-auto ${
                    darkMode ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    <pre className="text-sm whitespace-pre-wrap">
                      {typeof selectedTool.result === 'string' ? selectedTool.result : JSON.stringify(selectedTool.result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}