import { useState, useRef, useEffect } from 'react'
import { Send, ChevronDown, ChevronUp, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMoneyBillTrendUp,
  faPeopleGroup,
  faUserTie,
  faMagnifyingGlass,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons'
import { TradingViewWidget } from './TradingViewWidget'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Process ticker symbols for TradingView compatibility
  const processTickers = (tickers: string[]): string[] => {
    return tickers
      .filter((ticker) => ticker !== "^VIX")
      .map((ticker) => {
        if (
          ticker.endsWith(".BO") ||
          ticker.endsWith(".NS") ||
          ticker.endsWith(".NSE") ||
          ticker.endsWith(".BSE")
        ) {
          return "BSE:" + ticker.split(".")[0];
        }
        return ticker;
      });
  };

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

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "56px";
    }

    onMessageSent?.();

    // Send message to backend API
    try {
      const eventSource = new EventSource(
        `http://localhost:8000/api/chat?prompt=${encodeURIComponent(userMessage)}`
      )

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
          const content = data.payload?.content || ''
          const tickers = processTickers(data.tickers || [])
          
          // Close processing cards when completed
          setExpandedCards(prev => {
            const newState = { ...prev }
            currentCards.forEach(card => {
              delete newState[card.id]
            })
            return newState
          })
          
          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "ai-processing") {
              return [
                ...prev.slice(0, -1),
                {
                  type: "ai-response" as const,
                  content: "",
                  cards: currentCards,
                  finalCard: { title: "Conductor", content: content, tickers: tickers },
                },
              ];
            }
            return prev;
          })
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
    br: () => <br />,
  }

  // Recursively render nested data as bullet points
  const renderBulletPoints = (data: any, depth: number = 0): JSX.Element[] => {
    const items: JSX.Element[] = [];

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          items.push(
            <li
              key={index}
              className={`mb-2 ${
                darkMode ? "text-neutral-200" : "text-gray-800"
              }`}
            >
              <span
                className={`font-semibold ${
                  darkMode ? "text-green-400" : "text-blue-700"
                }`}
              >
                Item {index + 1}:
              </span>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                {renderBulletPoints(item, depth + 1)}
              </ul>
            </li>
          );
        } else {
          items.push(
            <li
              key={index}
              className={`${darkMode ? "text-neutral-200" : "text-gray-800"}`}
            >
              {String(item)}
            </li>
          );
        }
      });
    } else if (typeof data === "object" && data !== null) {
      Object.entries(data).forEach(([key, value]) => {
        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          items.push(
            <li
              key={key}
              className={`mb-2 ${
                darkMode ? "text-neutral-200" : "text-gray-800"
              }`}
            >
              <span
                className={`font-semibold ${
                  darkMode ? "text-green-400" : "text-blue-700"
                }`}
              >
                {key}:
              </span>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                {renderBulletPoints(value, depth + 1)}
              </ul>
            </li>
          );
        } else if (Array.isArray(value)) {
          items.push(
            <li
              key={key}
              className={`mb-2 ${
                darkMode ? "text-neutral-200" : "text-gray-800"
              }`}
            >
              <span
                className={`font-semibold ${
                  darkMode ? "text-green-400" : "text-blue-700"
                }`}
              >
                {key}:
              </span>
              <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                {renderBulletPoints(value, depth + 1)}
              </ul>
            </li>
          );
        } else {
          items.push(
            <li
              key={key}
              className={`${darkMode ? "text-neutral-200" : "text-gray-800"}`}
            >
              <span
                className={`font-semibold ${
                  darkMode ? "text-green-400" : "text-blue-700"
                }`}
              >
                {key}:
              </span>{" "}
              {String(value)}
            </li>
          );
        }
      });
    }

    return items;
  };

  return (
    <div
      className={`flex-1 flex flex-col ${
        darkMode ? "bg-neutral-900" : "bg-white"
      }`}
    >
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            /* Welcome message */
            <div className="text-center py-8">
              <h3
                className={`text-xl font-semibold mb-2 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome to PersonaQuant
              </h3>
              <p
                className={`${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                Start a conversation with our AI agents for quantitative analysis
              </p>
            </div>
          ) : (
            /* Messages */
            messages.map((message, i) => {
              const isUser = message.type === "user";
              const isAiResponse = message.type === "ai-response";
              const isProcessing = message.type === "ai-processing";

              // Render agent cards with expandable content
              const renderCards = (cards: AgentCard[], keyPrefix: string = "") =>
                cards?.map((card) => {
                  const expandKey = keyPrefix
                    ? `${keyPrefix}-${card.id}`
                    : card.id;
                  const isExpanded = expandedCards[expandKey]
      return (
        <div
          key={card.id}
          className={`border rounded-lg animate-fade-in ${
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
            onClick={() =>
              setExpandedCards((prev) => ({
                ...prev,
                [expandKey]: !prev[expandKey],
              }))
            }
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
            } space-y-3`}>
              {card.tools && card.tools.length > 0 && (
                <div className={`mb-3 pb-3 border-b ${
                  darkMode ? 'border-neutral-600' : 'border-gray-300'
                }`}>
                  <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                    Tools Used:
                  </div>
                  <div className="space-y-1">
                    {card.tools.map((tool, idx) => {
                      const getSymbol = () => {
                        if (tool.args?.time_horizon) return `(${tool.args.time_horizon})`
                        if (tool.args?.period) return `(${tool.args.period})`
                        if (tool.args?.risk_profile) return `(${tool.args.risk_profile})`
                        if (tool.args?.ticker) return `(${tool.args.ticker})`
                        if (tool.args?.symbol) return `(${tool.args.symbol})`
                        if (tool.args?.query) return `(${tool.args.query})`
                        return ''
                      }

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
                            args: tool.args,
                            result: tool.result,
                            agent: card.title
                          })}
                        >
                          <span>{tool.name} {getSymbol()}</span>
                          <span className={`text-xs ${darkMode ? 'text-neutral-400' : 'text-gray-500'}`}>
                            {getTime()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {card.taskDescription && (
                <div>
                  <div className={`text-sm ${
                    darkMode ? 'text-neutral-300' : 'text-gray-600'
                  }`}>
                    Working on task:
                  </div>
                  <div className={`text-sm ${
                    darkMode ? 'text-neutral-300' : 'text-gray-600'
                  }`}>
                    {card.taskDescription}
                  </div>
                </div>
              )}
              {card.content && (
                <div className={`text-sm ${
                  darkMode ? 'text-neutral-200' : 'text-gray-800'
                }`}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {card.content.replace(/\n/g, '  \n')}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
                  );
                });

              if (isProcessing && i === messages.length - 1) {
                return (
                  <div key={i} className="flex justify-start animate-fade-in">
                    <div className="w-full max-w-[90%] space-y-3">
                      {renderCards(message.cards || [])}
                    </div>
                  </div>
                );
              }

              if (isAiResponse) {
                return (
                  <div key={i} className="flex justify-start animate-fade-in">
                    <div className="w-full max-w-[90%] space-y-3">
                      {renderCards(message.cards || [], i.toString())}

                      {message.finalCard && (
                        <div
                          className={`border rounded-lg animate-fade-in ${
                            darkMode
                              ? 'border-neutral-600 bg-neutral-800'
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
                              darkMode ? 'border-neutral-600' : 'border-gray-200'
                            }`}
                          >
                            {/* Display TradingView charts for detected stock tickers */}
                            {message.finalCard.tickers &&
                              message.finalCard.tickers.length > 0 && (
                                <div className="mb-4">
                                  <TradingViewWidget
                                    symbols={message.finalCard.tickers}
                                    darkMode={darkMode}
                                  />
                                </div>
                              )}
                            <div
                              className={`text-sm ${
                                darkMode ? 'text-neutral-200' : 'text-gray-800'
                              }`}
                            >
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
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
                  className={`flex animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-4 rounded-2xl break-words overflow-wrap-anywhere ${
                      isUser
                        ? 'text-white'
                        : darkMode
                        ? 'bg-neutral-800 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                    style={isUser ? { backgroundColor: 'var(--primary)' } : {}}
                  >
                    <ReactMarkdown>{message.content}</ReactMarkdown>
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

      {/* Gradient fade overlay above input area */}
      <div className={`absolute bottom-0 left-0 right-0 mb-20 h-16 pointer-events-none bg-gradient-to-t ${
        darkMode
          ? 'from-neutral-900 via-neutral-900/80 to-transparent'
          : 'from-white via-white/80 to-transparent'
      }`}></div>

      <div className="px-3 pb-3 pt-1 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              className={`w-full px-4 py-4 pr-14 rounded-2xl border focus:outline-none focus:ring-2 resize-none min-h-[56px] overflow-hidden ${
                darkMode
                  ? 'bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              style={{ '--tw-ring-color': 'var(--primary)' } as React.CSSProperties}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto'
                  const newHeight = Math.min(textareaRef.current.scrollHeight, 284)
                  textareaRef.current.style.height = `${newHeight}px`
                  if (textareaRef.current.scrollHeight > 284) {
                    textareaRef.current.scrollTop = textareaRef.current.scrollHeight
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !loading) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Message..."
              rows={1}
              ref={textareaRef}
            />
            <button
              className="absolute right-3 bottom-3 p-2 text-white rounded-lg disabled:opacity-50 transition-all duration-200 ease-out hover:opacity-90 hover:scale-110 active:scale-95"
              style={{ backgroundColor: 'var(--primary)' }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>

          <p className={`text-center text-xs mt-1 ${
            darkMode ? 'text-neutral-400' : 'text-gray-500'
          }`}>
            AI agents can make mistakes. Consider checking important information.
          </p>
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
                      <ul className="list-none space-y-1">
                        {renderBulletPoints(selectedTool.args)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              {selectedTool.result && (
                <div className="mt-2 flex flex-col gap-2 overflow-hidden">
                  <label className={`text-sm font-medium ${darkMode ? 'text-neutral-300' : 'text-gray-700'}`}>
                    Result:
                  </label>
                  <div className={`p-4 rounded-lg overflow-y-auto ${
                    darkMode ? 'bg-neutral-700 text-neutral-200' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {(() => {
                      if (typeof selectedTool.result === 'string' && selectedTool.result.match(/^["']?[0-9.]+["']?$/)) {
                        return (
                          <div className={`text-lg font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {selectedTool.result.replace(/["']/g, '')}
                          </div>
                        );
                      }

                      let parsed = null;
                      try {
                        let cleanResult = selectedTool.result;
                        if (typeof cleanResult === 'string') {
                          cleanResult = cleanResult.replace(/np\.float64\(([^)]+)\)/g, '$1');
                          if (cleanResult.includes("'") && cleanResult.startsWith('{')) {
                            let jsonString = cleanResult.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null');
                            try {
                              parsed = JSON.parse(jsonString);
                            } catch {
                              parsed = eval('(' + cleanResult + ')');
                            }
                          } else {
                            try {
                              parsed = JSON.parse(cleanResult);
                            } catch {
                              parsed = eval('(' + cleanResult + ')');
                            }
                          }
                        } else {
                          parsed = cleanResult;
                        }

                        if (Array.isArray(parsed) && (selectedTool.name.includes('search') || selectedTool.name.includes('news'))) {
                          return (
                            <div className="grid grid-cols-3 gap-4">
                              {parsed.map((item, index) => (
                                <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'bg-neutral-800 border-neutral-600' : 'bg-gray-100 border-gray-200'}`}>
                                  {item.title && <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>}
                                  {item.body && <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.body}</p>}
                                  {item.image && <img src={item.image} alt="News thumbnail" className="w-full h-32 object-cover rounded mt-2" />}
                                  {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className={`text-sm underline ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>View Source</a>}
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return <ul className="list-none space-y-1 text-sm">{renderBulletPoints(parsed)}</ul>;
                      } catch {
                        if (typeof selectedTool.result === 'string') {
                          return <div className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{selectedTool.result}</div>;
                        }
                        return <pre className={`text-xs font-mono whitespace-pre-wrap ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{JSON.stringify(selectedTool.result, null, 2)}</pre>;
                      }
                    })()}
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