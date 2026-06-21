import { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { Send, ChevronDown, ChevronUp, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillTrendUp,
  faPeopleGroup,
  faUserTie,
  faMagnifyingGlass,
  faClipboardList,
} from "@fortawesome/free-solid-svg-icons";
import { TradingViewWidget } from "./TradingViewWidget";

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
  const [displayedContent, setDisplayedContent] = useState<{[key: string]: string}>({});
  const contentTrackerRef = useRef<{[key: string]: string}>({});
  const intervalsRef = useRef<{[key: string]: ReturnType<typeof setInterval>}>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter effect for card content
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.type === 'ai-response' || msg.type === 'ai-processing') {
        msg.cards?.forEach((card) => {
          // Task description animation
          const taskKey = `${card.id}-task`;
          if (card.taskDescription && contentTrackerRef.current[taskKey] !== card.taskDescription) {
            if (intervalsRef.current[taskKey]) {
              clearInterval(intervalsRef.current[taskKey]);
            }
            
            contentTrackerRef.current[taskKey] = card.taskDescription;
            const words = card.taskDescription.split(' ');
            let currentIndex = 0;
            
            flushSync(() => {
              setDisplayedContent((prev) => ({ ...prev, [taskKey]: '' }));
            });
            
            intervalsRef.current[taskKey] = setInterval(() => {
              currentIndex += 2;
              if (currentIndex <= words.length) {
                setDisplayedContent((prev) => ({
                  ...prev,
                  [taskKey]: words.slice(0, currentIndex).join(' '),
                }));
              } else {
                setDisplayedContent((prev) => ({
                  ...prev,
                  [taskKey]: words.join(' '),
                }));
                clearInterval(intervalsRef.current[taskKey]);
                delete intervalsRef.current[taskKey];
              }
            }, 15);
          }
          
          // Content animation
          if (card.content && contentTrackerRef.current[card.id] !== card.content) {
            if (intervalsRef.current[card.id]) {
              clearInterval(intervalsRef.current[card.id]);
            }
            
            contentTrackerRef.current[card.id] = card.content;
            const words = card.content.split(' ');
            let currentIndex = 0;
            
            flushSync(() => {
              setDisplayedContent((prev) => ({ ...prev, [card.id]: '' }));
            });
            
            intervalsRef.current[card.id] = setInterval(() => {
              currentIndex += 2;
              if (currentIndex <= words.length) {
                setDisplayedContent((prev) => ({
                  ...prev,
                  [card.id]: words.slice(0, currentIndex).join(' '),
                }));
              } else {
                setDisplayedContent((prev) => ({
                  ...prev,
                  [card.id]: words.join(' '),
                }));
                clearInterval(intervalsRef.current[card.id]);
                delete intervalsRef.current[card.id];
              }
            }, 15);
          }
        });
        
        if (msg.finalCard?.content && contentTrackerRef.current['final-card'] !== msg.finalCard.content) {
          if (intervalsRef.current['final-card']) {
            clearInterval(intervalsRef.current['final-card']);
          }
          
          contentTrackerRef.current['final-card'] = msg.finalCard.content;
          const words = msg.finalCard.content.split(' ');
          let currentIndex = 0;
          
          flushSync(() => {
            setDisplayedContent((prev) => ({ ...prev, 'final-card': '' }));
          });
          
          intervalsRef.current['final-card'] = setInterval(() => {
            currentIndex += 2;
            if (currentIndex <= words.length) {
              setDisplayedContent((prev) => ({
                ...prev,
                'final-card': words.slice(0, currentIndex).join(' '),
              }));
            } else {
              setDisplayedContent((prev) => ({
                ...prev,
                'final-card': words.join(' '),
              }));
              clearInterval(intervalsRef.current['final-card']);
              delete intervalsRef.current['final-card'];
            }
          }, 15);
        }
      }
    });
  }, [messages]);

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

  // Custom markdown components for consistent styling
  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1
        className={`text-sm md:text-lg font-bold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2
        className={`text-xs md:text-base font-semibold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}
      >
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3
        className={`text-xs md:text-sm font-medium mb-1 ${
          darkMode ? "text-neutral-300" : "text-gray-700"
        }`}
      >
        {children}
      </h3>
    ),
    p: ({ children }: any) => (
      <p className={`mb-2 text-xs md:text-base ${darkMode ? "text-neutral-200" : "text-gray-800"}`}>
        {children}
      </p>
    ),
    ul: ({ children }: any) => (
      <ul
        className={`mb-2 ml-4 space-y-1 text-xs md:text-base ${
          darkMode ? "text-neutral-200" : "text-gray-800"
        }`}
      >
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol
        className={`list-decimal list-inside mb-2 ml-4 space-y-1 text-xs md:text-base ${
          darkMode ? "text-neutral-200" : "text-gray-800"
        }`}
      >
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li
        className={`text-xs md:text-base ${
          darkMode ? "text-neutral-200" : "text-gray-800"
        } flex items-start`}
      >
        <span className="mr-2 font-bold text-sm md:text-lg">•</span>
        <span className="flex-1">{children}</span>
      </li>
    ),
    strong: ({ children }: any) => (
      <strong
        className={`text-xs md:text-base font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
      >
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em
        className={`text-xs md:text-base italic ${darkMode ? "text-neutral-300" : "text-gray-700"}`}
      >
        {children}
      </em>
    ),
    code: ({ children }: any) => (
      <code
        className={`px-1 py-0.5 rounded text-xs font-mono ${
          darkMode
            ? "bg-neutral-600 text-neutral-200"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <pre
        className={`p-3 rounded-lg overflow-x-auto text-xs md:text-sm font-mono mb-2 ${
          darkMode
            ? "bg-neutral-600 text-neutral-200"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {children}
      </pre>
    ),
    blockquote: ({ children }: any) => (
      <blockquote
        className={`border-l-4 pl-4 italic mb-2 text-xs md:text-base ${
          darkMode
            ? "border-neutral-600 text-neutral-300"
            : "border-gray-300 text-gray-600"
        }`}
      >
        {children}
      </blockquote>
    ),
    table: ({ children }: any) => (
      <table
        className={`min-w-full mb-4 border-collapse text-xs md:text-base ${
          darkMode ? "border-neutral-600" : "border-gray-300"
        }`}
      >
        {children}
      </table>
    ),
    thead: ({ children }: any) => (
      <thead className={`${darkMode ? "bg-neutral-700" : "bg-gray-100"}`}>
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => (
      <tr
        className={`border-b ${
          darkMode ? "border-neutral-600" : "border-gray-300"
        }`}
      >
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th
        className={`px-3 py-2 text-left font-semibold text-xs md:text-base ${
          darkMode
            ? "text-white border-neutral-600"
            : "text-gray-900 border-gray-300"
        } border`}
      >
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td
        className={`px-3 py-2 text-xs md:text-base ${
          darkMode
            ? "text-neutral-200 border-neutral-600"
            : "text-gray-800 border-gray-300"
        } border`}
      >
        {children}
      </td>
    ),
    hr: () => (
      <hr
        className={`my-3 ${
          darkMode ? "border-neutral-600" : "border-gray-300"
        }`}
      />
    ),
    br: () => <br />,
  };

  // Timer to update running tool times
  useEffect(() => {
    const interval = setInterval(() => {
      if (loading) {
        forceUpdate((prev) => prev + 1);
      }
    }, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [loading]);

  // ESC key to close popup
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedTool) {
        setSelectedTool(null);
      }
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [selectedTool]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages((prev) => [
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
        `/api/chat?prompt=${encodeURIComponent(
          userMessage
        )}`
      );

      let currentCards: AgentCard[] = [];

      // Handle individual agent tool events (start/complete)
      const handleAgentTool = (data: any, agentTitle: string) => {
        const toolName = data.payload?.tool?.tool_name;
        const agentName = data.payload?.agent_name;

        if (
          data.event === "ToolCallStarted" &&
          toolName &&
          toolName !== "delegate_task_to_member" &&
          toolName !== "update_user_memory" &&
          agentName
        ) {
          const toolArgs = data.payload?.tool?.tool_args;
          const agentCards = currentCards.filter(
            (card) => card.title === agentTitle
          );
          const latestCard = agentCards[agentCards.length - 1];

          currentCards = currentCards.map((card) =>
            card.id === latestCard?.id
              ? {
                  ...card,
                  tools: [
                    ...card.tools,
                    { name: toolName, startTime: Date.now(), args: toolArgs },
                  ],
                }
              : card
          );

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "ai-processing") {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, cards: currentCards },
              ];
            }
            return prev;
          });
        }

        if (
          data.event === "ToolCallCompleted" &&
          toolName &&
          toolName !== "delegate_task_to_member" &&
          toolName !== "update_user_memory" &&
          agentName
        ) {
          const duration = data.payload?.tool?.metrics?.duration;
          const result = data.payload?.tool?.result;
          const agentCards = currentCards.filter(
            (card) => card.title === agentTitle
          );
          const latestCard = agentCards[agentCards.length - 1];

          // console.log(`🔧 ToolCallCompleted (${agentName}) EVENT:`, data.payload?.tool)
          console.log(`🔧 ToolCallCompleted (${agentName}) EVENT:`, data);
          currentCards = currentCards.map((card) => {
            if (card.id === latestCard?.id) {
              const updatedTools = card.tools.map((tool) =>
                tool.name === toolName && !tool.duration
                  ? { ...tool, duration, result }
                  : tool
              );
              return { ...card, tools: updatedTools };
            }
            return card;
          });

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "ai-processing") {
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, cards: currentCards },
              ];
            }
            return prev;
          });
        }
      };

      // Handle team-level tool events (delegation)
      eventSource.addEventListener("tool", (event) => {
        const data = JSON.parse(event.data);

        if (data.event === "TeamToolCallStarted") {
          console.log(
            `🔧 TeamToolCallStarted (${data.payload?.tool?.tool_args?.member_id}) EVENT:`,
            JSON.stringify(
              data.payload?.tool?.tool_args?.task,
              null,
              2
            )
          );
          const toolName = data.payload?.tool?.tool_name;
          const memberId = data.payload?.tool?.tool_args?.member_id;
          const taskDescription =
            data.payload?.tool?.tool_args?.task;
          const runId = data.meta?.runId;

          if (toolName === "delegate_task_to_member" && memberId && runId) {
            let title = "";
            if (memberId === "agent-1") title = "Finance Agent";
            else if (memberId === "agent-2") title = "Sentiment Agent";
            else if (memberId === "agent-3") title = "Advisory Agent";
            else if (memberId === "agent-4") title = "Search Agent";

            if (title) {
              const newCard: AgentCard = {
                id: `card-${memberId}-${Date.now()}`,
                runId: runId,
                title: title,
                tools: [],
                content: "",
                taskDescription: taskDescription || "",
                startTime: Date.now(),
              };
              currentCards = [...currentCards, newCard];

              // Auto-expand processing cards
              setExpandedCards((prev) => ({ ...prev, [newCard.id]: true }));

              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.type === "ai-processing") {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, cards: currentCards },
                  ];
                }
                return prev;
              });
            }
          }
        }

        if (data.event === "TeamToolCallCompleted") {
          console.log(
            `🔧 TeamToolCallCompleted (${data.payload?.tool?.tool_args?.member_id}) EVENT:`,
            JSON.stringify(data.payload?.tool?.result, null, 2)
          );
          const toolName = data.payload?.tool?.tool_name;
          const result = data.payload?.tool?.result;
          const runId = data.meta?.runId;

          if (toolName === "delegate_task_to_member" && result && runId) {
            const memberId = data.payload?.tool?.tool_args?.member_id;
            // Find the most recent card for this member since runIds might be different
            const memberCards = currentCards.filter((card) =>
              card.id.includes(memberId)
            );
            const latestMemberCard = memberCards[memberCards.length - 1];

            currentCards = currentCards.map((card) => {
              if (card.id === latestMemberCard?.id) {
                const totalDuration = card.startTime
                  ? (Date.now() - card.startTime) / 1000
                  : undefined;
                return {
                  ...card,
                  content: result,
                  taskDescription: undefined,
                  totalDuration,
                };
              }
              return card;
            });

            // Update messages immediately to show live updates
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.type === "ai-processing") {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, cards: currentCards },
                ];
              }
              return prev;
            });
          }
        }
      });

      eventSource.addEventListener("tool-finance", (event) => {
        handleAgentTool(JSON.parse(event.data), "Finance Agent");
      });

      eventSource.addEventListener("tool-sentiment", (event) => {
        handleAgentTool(JSON.parse(event.data), "Sentiment Agent");
      });

      eventSource.addEventListener("tool-advisory", (event) => {
        handleAgentTool(JSON.parse(event.data), "Advisory Agent");
      });

      eventSource.addEventListener("tool-search", (event) => {
        handleAgentTool(JSON.parse(event.data), "Search Agent");
      });

      eventSource.addEventListener("run", (event) => {
        const data = JSON.parse(event.data);

        if (data.event === "TeamRunCompleted") {
          // console.log('🏁 TeamRunCompleted EVENT:', data.payload)
          console.log("🏁 TeamRunCompleted EVENT:", data);
          setLoading(false);

          const content = data.payload?.content || "";
          const tickers = processTickers(data.tickers || []);
          console.log("TeamRunCompleted TICKERS:", tickers);

          const finalCard = {
            title: "Conductor",
            content: content,
            tickers: tickers,
          };

          // Close processing cards when completed
          setExpandedCards((prev) => {
            const newState = { ...prev };
            currentCards.forEach((card) => {
              delete newState[card.id];
            });
            return newState;
          });

          setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.type === "ai-processing") {
              return [
                ...prev.slice(0, -1),
                {
                  type: "ai-response" as const,
                  content: "",
                  cards: currentCards,
                  finalCard: finalCard,
                },
              ];
            }
            return prev;
          });

          onToolsCompleted?.();
        }
      });

      // Handle error events
      eventSource.addEventListener("error", (event: MessageEvent) => {
        setLoading(false);

        let errorMessage = "An error occurred while processing your request.";
        if (event.data) {
          try {
            const errorData = JSON.parse(event.data);
            if (errorData.error) {
              errorMessage = errorData.error;
            }
          } catch {}
        }

        const errorCard: AgentCard = {
          id: `error-${Date.now()}`,
          runId: `error-${Date.now()}`,
          title: "Error",
          tools: [],
          content: errorMessage,
        };

        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.type === "ai-processing") {
            return [
              ...prev.slice(0, -1),
              {
                type: "ai-response" as const,
                content: "",
                cards: [...currentCards, errorCard],
              },
            ];
          }
          return prev;
        });

        eventSource.close();
      });

      eventSource.addEventListener("end", () => {
        setLoading(false);
        eventSource.close();
      });
    } catch (error) {
      console.error("Failed to create EventSource:", error);
      setLoading(false);
    }
  };

  // Recursively render nested data as bullet points
  const renderBulletPoints = (data: any, depth: number = 0): React.ReactNode[] => {
    const items: React.ReactNode[] = [];

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
      <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 transition-all duration-500 ease-in-out ${
        messages.length === 0 ? "flex flex-col" : ""
      }`}>
        <div className={`max-w-4xl mx-auto space-y-4 transition-all duration-500 ease-in-out ${
          messages.length === 0 ? "flex-1 flex flex-col justify-center" : ""
        }`}>
          {messages.length === 0 ? (
            // Welcome message 
            <div className="text-center">
              <h1
                className={`text-xl md:text-4xl font-bold mb-4 ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Welcome to PersonaQuant
              </h1>
              <p
                className={`text-xs md:text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Get insights from our specialized AI agents for finance, sentiment,
                and market analysis
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isUser = msg.type === "user";
              const isProcessing = msg.type === "ai-processing";
              const isAiResponse = msg.type === "ai-response";

              // Render agent cards with expandable content
              const renderCards = (
                cards: AgentCard[],
                keyPrefix: string = ""
              ) =>
                cards?.map((card) => {
                  const expandKey = keyPrefix
                    ? `${keyPrefix}-${card.id}`
                    : card.id;
                  return (
                    <div
                      key={card.id}
                      className={`border rounded-lg animate-fade-in ${
                        darkMode
                          ? "border-neutral-600 bg-neutral-800"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div
                        className={`p-3 cursor-pointer flex items-center justify-between rounded-t-lg ${
                          card.title === "Finance Agent"
                            ? darkMode
                              ? "bg-green-900/30 hover:bg-green-800/40"
                              : "bg-green-100/50 hover:bg-green-200/60"
                            : card.title === "Sentiment Agent"
                            ? darkMode
                              ? "bg-orange-900/30 hover:bg-orange-800/40"
                              : "bg-orange-100/50 hover:bg-orange-200/60"
                            : card.title === "Advisory Agent"
                            ? darkMode
                              ? "bg-blue-900/30 hover:bg-blue-800/40"
                              : "bg-blue-100/50 hover:bg-blue-200/60"
                            : card.title === "Search Agent"
                            ? darkMode
                              ? "bg-neutral-700/30 hover:bg-neutral-600/40"
                              : "bg-gray-200/50 hover:bg-gray-300/60"
                            : card.title === "Error"
                            ? darkMode
                              ? "bg-red-900/30 hover:bg-red-800/40"
                              : "bg-red-100/50 hover:bg-red-200/60"
                            : darkMode
                            ? "bg-neutral-600/30 hover:bg-neutral-500/40"
                            : "bg-gray-100/50 hover:bg-gray-200/60"
                        }`}
                        onClick={() =>
                          setExpandedCards((prev) => ({
                            ...prev,
                            [expandKey]: !prev[expandKey],
                          }))
                        }
                      >
                        <div className="flex items-center gap-2">
                          {card.title === "Finance Agent" && (
                            <FontAwesomeIcon
                              icon={faMoneyBillTrendUp}
                              className={`${
                                darkMode ? "text-green-400" : "text-green-600"
                              } ${!card.content ? "animate-pulse" : ""}`}
                            />
                          )}
                          {card.title === "Sentiment Agent" && (
                            <FontAwesomeIcon
                              icon={faPeopleGroup}
                              className={`${
                                darkMode ? "text-orange-400" : "text-orange-600"
                              } ${!card.content ? "animate-pulse" : ""}`}
                            />
                          )}
                          {card.title === "Advisory Agent" && (
                            <FontAwesomeIcon
                              icon={faUserTie}
                              className={`${
                                darkMode ? "text-blue-400" : "text-blue-600"
                              } ${!card.content ? "animate-pulse" : ""}`}
                            />
                          )}
                          {card.title === "Search Agent" && (
                            <FontAwesomeIcon
                              icon={faMagnifyingGlass}
                              className={`${
                                darkMode ? "text-gray-300" : "text-gray-800"
                              } ${!card.content ? "animate-pulse" : ""}`}
                            />
                          )}
                          <span
                            className={`text-xs md:text-base font-medium ${
                              darkMode ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {card.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              card.title === "Finance Agent"
                                ? darkMode
                                  ? "bg-green-900 text-green-300"
                                  : "bg-green-200 text-green-800"
                                : card.title === "Sentiment Agent"
                                ? darkMode
                                  ? "bg-orange-900 text-orange-300"
                                  : "bg-orange-200 text-orange-800"
                                : card.title === "Advisory Agent"
                                ? darkMode
                                  ? "bg-blue-900 text-blue-300"
                                  : "bg-blue-200 text-blue-800"
                                : card.title === "Search Agent"
                                ? darkMode
                                  ? "bg-neutral-700 text-neutral-300"
                                  : "bg-gray-300 text-gray-800"
                                : darkMode
                                ? "bg-neutral-700 text-neutral-200"
                                : "bg-gray-300 text-gray-700"
                            }`}
                          >
                            {card.totalDuration
                              ? `${card.totalDuration.toFixed(1)}s`
                              : card.startTime
                              ? `${(
                                  (Date.now() - card.startTime) /
                                  1000
                                ).toFixed(1)}s`
                              : "0.0s"}
                          </span>
                          {expandedCards[expandKey] ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>
                      </div>
                      {expandedCards[expandKey] && (
                        <div
                          className={`p-3 border-t ${
                            darkMode ? "border-neutral-600" : "border-gray-200"
                          } space-y-3`}
                        >
                          {card.tools && card.tools.length > 0 && (
                            <div
                              className={`mb-3 pb-3 border-b ${
                                darkMode
                                  ? "border-neutral-600"
                                  : "border-gray-300"
                              }`}
                            >
                              <div
                                className={`text-xs md:text-sm font-medium mb-2 ${
                                  darkMode
                                    ? "text-neutral-300"
                                    : "text-gray-700"
                                }`}
                              >
                                Tools Used:
                              </div>
                              <div className="space-y-1">
                                {card.tools.map((tool, idx) => {
                                  // Extract relevant parameter for display
                                  const getSymbol = () => {
                                    if (tool.args?.time_horizon)
                                      return `(${tool.args.time_horizon})`;
                                    if (tool.args?.period)
                                      return `(${tool.args.period})`;
                                    if (tool.args?.risk_profile)
                                      return `(${tool.args.risk_profile})`;
                                    if (tool.args?.ticker)
                                      return `(${tool.args.ticker})`;
                                    if (tool.args?.symbol)
                                      return `(${tool.args.symbol})`;
                                    if (tool.args?.query)
                                      return `(${tool.args.query})`;
                                    return "";
                                  };

                                  // Calculate tool execution time
                                  const getTime = () => {
                                    if (tool.duration) {
                                      return `${tool.duration.toFixed(1)}s`;
                                    } else if (tool.startTime) {
                                      const elapsed =
                                        (Date.now() - tool.startTime) / 1000;
                                      return `${elapsed.toFixed(1)}s`;
                                    }
                                    return "0.0s";
                                  };

                                  return (
                                    <div
                                      key={idx}
                                      className={`text-xs md:text-sm px-2 py-1 rounded flex justify-between items-center cursor-pointer transition-all duration-200 ease-in-out hover:scale-102 hover:shadow-sm ${
                                        darkMode
                                          ? "bg-neutral-700 text-neutral-200 hover:bg-neutral-600"
                                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                      }`}
                                      onClick={() =>
                                        setSelectedTool({
                                          name: tool.name,
                                          duration: tool.duration,
                                          args: tool.args,
                                          result: tool.result,
                                          agent: card.title,
                                        })
                                      }
                                    >
                                      <span>
                                        {tool.name} {getSymbol()}
                                      </span>
                                      <span
                                        className={`text-xs ${
                                          darkMode
                                            ? "text-neutral-400"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {getTime()}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {card.taskDescription && (
                            <div>
                              <div
                                className={`text-xs md:text-sm ${
                                  darkMode
                                    ? "text-neutral-300"
                                    : "text-gray-600"
                                }`}
                              >
                                Working on task:
                              </div>
                              <div
                                className={`text-xs md:text-sm ${
                                  darkMode
                                    ? "text-neutral-300"
                                    : "text-gray-600"
                                }`}
                              >
                                {displayedContent[`${card.id}-task`] !== undefined ? displayedContent[`${card.id}-task`] : ''}
                              </div>
                            </div>
                          )}
                          {card.content && (
                            <div>
                            {card.title !== "Error" && (
                              <div
                                className={`text-xs md:text-sm font-medium mb-2 ${
                                  darkMode
                                    ? "text-neutral-300"
                                    : "text-gray-700"
                                }`}
                              ></div>
                            )}{" "}
                            {/*Content:*/}
                            <div
                              className={`text-xs md:text-sm ${
                                darkMode ? "text-neutral-200" : "text-gray-800"
                              }`}
                            >
                              {(() => {
                                try {
                                  return displayedContent[card.id] !== undefined ? (
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={markdownComponents}
                                    >
                                      {displayedContent[card.id].replace(/\n/g, "  \n")}
                                    </ReactMarkdown>
                                  ) : null;
                                } catch (error) {
                                  console.error(
                                    "Agent card markdown render error:",
                                    error
                                  );
                                  return (
                                    <pre
                                      className={`whitespace-pre-wrap ${
                                        darkMode
                                          ? "text-neutral-200"
                                          : "text-gray-800"
                                      }`}
                                    >
                                      {card.content}
                                    </pre>
                                  );
                                }
                              })()}
                            </div>
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
                    <div className="w-full max-w-full md:max-w-[90%] space-y-3">
                      {renderCards(msg.cards || [])}
                    </div>
                  </div>
                );
              }

              if (isAiResponse) {
                return (
                  <div key={i} className="flex justify-start animate-fade-in">
                    <div className="w-full max-w-full md:max-w-[90%] space-y-3">
                      {renderCards(msg.cards || [], i.toString())}

                      {msg.finalCard && (
                        <div
                          className={`border rounded-lg animate-fade-in ${
                            darkMode
                              ? "border-neutral-600 bg-neutral-800"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div
                            className={`p-3 text-xs md:text-base font-medium rounded-t-lg ${
                              darkMode
                                ? "text-white bg-yellow-900/30"
                                : "text-gray-900 bg-yellow-100/50"
                            } flex items-center gap-2`}
                          >
                            <FontAwesomeIcon
                              icon={faClipboardList}
                              className={`${
                                darkMode ? "text-yellow-400" : "text-yellow-600"
                              }`}
                            />
                            {msg.finalCard.title}
                          </div>
                          <div
                            className={`px-3 py-3 border-t ${
                              darkMode
                                ? "border-neutral-600"
                                : "border-gray-200"
                            }`}
                          >
                            {/* Display TradingView charts for detected stock tickers */}
                            {msg.finalCard.tickers &&
                              msg.finalCard.tickers.length > 0 && (
                                <div className="mb-4">
                                  <TradingViewWidget
                                    symbols={msg.finalCard.tickers}
                                    darkMode={darkMode}
                                  />
                                </div>
                              )}
                            <div
                              className={`text-xs md:text-sm ${
                                darkMode ? "text-neutral-200" : "text-gray-800"
                              }`}
                            >
                              {(() => {
                              try {
                                return displayedContent['final-card'] !== undefined ? (
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={markdownComponents}
                                  >
                                    {displayedContent['final-card'].replace(
                                      /\n/g,
                                      "  \n"
                                    )}
                                  </ReactMarkdown>
                                ) : null;
                              } catch (error) {
                                console.error("Markdown render error:", error);
                                return (
                                  <pre
                                    className={`whitespace-pre-wrap ${
                                      darkMode
                                        ? "text-gray-200"
                                        : "text-gray-800"
                                    }`}
                                  >
                                    {msg.finalCard.content}
                                  </pre>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`flex animate-fade-in ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[70%] p-3 md:p-4 rounded-2xl break-words overflow-wrap-anywhere text-xs md:text-base ${
                    isUser
                      ? "text-white"
                      : darkMode
                      ? "bg-neutral-800 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                  style={isUser ? { backgroundColor: "var(--primary)" } : {}}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            );
          })
          )}

          {/* Loading indicator */}
          {loading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.type !== "ai-response" && (
              <div className="flex justify-start">
                <div
                  className={`p-4 rounded-2xl text-xs md:text-base ${
                    darkMode
                      ? "bg-neutral-800 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <span className="inline-flex">
                    {"Working...".split("").map((char, i) => (
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
        </div>
      </div>

      {/* Gradient fade overlay above input area */}
      {messages.length > 0 && (
        <div
          className={`absolute bottom-0 left-0 right-0 mb-20 h-16 pointer-events-none bg-gradient-to-t ${
            darkMode
              ? "from-neutral-900 via-neutral-900/80 to-transparent"
              : "from-white via-white/80 to-transparent"
          }`}
        ></div>
      )}

      <div className={`px-2 md:px-3 pb-2 md:pb-3 pt-1 relative z-10 ${
          messages.length === 0 ? "" : ""
        }`}
        style={{ transition: 'margin-bottom 0.3s ease-in-out' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              className={`w-full px-4 py-4 pr-14 rounded-2xl border focus:outline-none focus:ring-2 resize-none min-h-[56px] overflow-hidden text-xs md:text-base ${
                darkMode
                  ? "bg-neutral-800 border-neutral-600 text-white placeholder-neutral-400"
                  : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
              }`}
              style={
                { "--tw-ring-color": "var(--primary)" } as React.CSSProperties
              }
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  const newHeight = Math.min(
                    textareaRef.current.scrollHeight,
                    284
                  );
                  textareaRef.current.style.height = `${newHeight}px`;
                  if (textareaRef.current.scrollHeight > 284) {
                    textareaRef.current.scrollTop =
                      textareaRef.current.scrollHeight;
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !loading) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message..."
              rows={1}
              ref={textareaRef}
            />
            <button
              className="absolute right-3 bottom-4 p-2 text-white rounded-lg disabled:opacity-50 transition-all duration-200 ease-out hover:opacity-90 hover:scale-110 active:scale-95"
              style={{ backgroundColor: "var(--primary)" }}
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              <Send size={20} />
            </button>
          </div>

          <p
            className={`text-center text-xs mt-1 ${
              darkMode ? "text-neutral-400" : "text-gray-500"
            }`}
          >
            AI agents can make mistakes. Consider checking important
            information.
          </p>
        </div>
      </div>

      {/* Tool details popup */}
      {selectedTool && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 animate-fade-in"
          onClick={() => setSelectedTool(null)}
        >
          <div
            className={`w-full md:w-[80%] h-full md:h-[80%] md:rounded-xl shadow-2xl animate-scale-in ${
              darkMode
                ? "bg-neutral-800 border-neutral-600"
                : "bg-white border-gray-200"
            } border-0 md:border-2 flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`flex items-center justify-between p-6 border-b ${
                darkMode ? "border-neutral-600" : "border-gray-200"
              }`}
            >
              <h3
                className={`text-base md:text-xl font-semibold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}
              >
                Tool Details
              </h3>
              <button
                onClick={() => setSelectedTool(null)}
                className={`p-2 rounded hover:bg-opacity-80 ${
                  darkMode ? "hover:bg-neutral-700" : "hover:bg-gray-100"
                }`}
              >
                <X
                  size={24}
                  className={darkMode ? "text-neutral-400" : "text-gray-600"}
                />
              </button>
            </div>
            <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-8 gap-4 md:gap-6">
                <div className="col-span-2 md:col-span-2">
                  <label
                    className={`text-xs md:text-sm font-medium ${
                      darkMode ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    Name:
                  </label>
                  <p
                    className={`mt-2 text-sm md:text-lg font-semibold ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {selectedTool.name}
                  </p>
                </div>
                <div className="col-span-1 md:col-span-1">
                  <label
                    className={`text-xs md:text-sm font-medium ${
                      darkMode ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    Status:
                  </label>
                  <p
                    className={`mt-2 text-sm md:text-lg font-semibold ${
                      selectedTool.duration
                        ? darkMode
                          ? "text-green-400"
                          : "text-green-600"
                        : darkMode
                        ? "text-yellow-400"
                        : "text-yellow-600"
                    }`}
                  >
                    {selectedTool.duration ? "Completed" : "Running"}
                  </p>
                </div>
                {selectedTool.duration && (
                  <div className="col-span-1 md:col-span-1">
                    <label
                      className={`text-xs md:text-sm font-medium ${
                        darkMode ? "text-neutral-300" : "text-gray-700"
                      }`}
                    >
                      Duration:
                    </label>
                    <p
                      className={`mt-2 text-sm md:text-lg font-semibold ${
                        darkMode ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {selectedTool.duration.toFixed(4)}s
                    </p>
                  </div>
                )}
                {selectedTool.args && (
                  <div className="col-span-2 md:col-span-4">
                    <label
                      className={`text-xs md:text-sm font-medium ${
                        darkMode ? "text-neutral-300" : "text-gray-700"
                      }`}
                    >
                      Arguments:
                    </label>
                    <div
                      className={`mt-2 p-3 rounded-lg text-xs md:text-sm ${
                        darkMode
                          ? "bg-neutral-700 text-neutral-200"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <ul className="list-none space-y-1">
                        {renderBulletPoints(selectedTool.args)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              {selectedTool.result && (
                <div className="mt-2 flex flex-col gap-2 overflow-hidden">
                  <label
                    className={`text-xs md:text-sm font-medium ${
                      darkMode ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    Result:
                  </label>
                  <div
                    className={`p-4 rounded-lg overflow-y-auto ${
                      darkMode
                        ? "bg-neutral-700 text-neutral-200"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {(() => {
                      // Special handling for simple string results (like stock prices)
                      if (
                        typeof selectedTool.result === "string" &&
                        selectedTool.result.match(/^["']?[0-9.]+["']?$/)
                      ) {
                        return (
                          <div
                            className={`text-sm md:text-lg font-semibold ${
                              darkMode ? "text-green-400" : "text-green-600"
                            }`}
                          >
                            {selectedTool.result.replace(/["']/g, "")}
                          </div>
                        );
                      }

                      let parsed = null;
                      try {
                        let cleanResult = selectedTool.result;
                        if (typeof cleanResult === "string") {
                          // Clean numpy references
                          cleanResult = cleanResult.replace(
                            /np\.float64\(([^)]+)\)/g,
                            "$1"
                          );
                          // Handle Python dict format
                          if (
                            cleanResult.includes("'") &&
                            cleanResult.startsWith("{")
                          ) {
                            // Replace Python single quotes with double quotes for JSON parsing
                            let jsonString = cleanResult
                              .replace(/'/g, '"')
                              .replace(/True/g, "true")
                              .replace(/False/g, "false")
                              .replace(/None/g, "null");
                            try {
                              parsed = JSON.parse(jsonString);
                            } catch {
                              // Fallback to eval if JSON parsing fails
                              parsed = eval("(" + cleanResult + ")");
                            }
                          } else {
                            // Try JSON first for regular JSON strings
                            try {
                              parsed = JSON.parse(cleanResult);
                            } catch {
                              // Try eval for Python dict
                              parsed = eval("(" + cleanResult + ")");
                            }
                          }
                        } else {
                          parsed = cleanResult;
                        }

                        // Special handling for search/news results
                        if (
                          Array.isArray(parsed) &&
                          (selectedTool.name.includes("search") ||
                            selectedTool.name.includes("news"))
                        ) {
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {parsed.map((item, index) => (
                                <div
                                  key={index}
                                  className={`p-4 rounded-lg border ${
                                    darkMode
                                      ? "bg-neutral-800 border-neutral-600"
                                      : "bg-gray-100 border-gray-200"
                                  }`}
                                >
                                  {item.title && (
                                    <h4
                                      className={`text-xs md:text-base font-semibold mb-2 ${
                                        darkMode
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {item.title}
                                    </h4>
                                  )}
                                  {item.body && (
                                    <p
                                      className={`text-xs md:text-sm mb-2 ${
                                        darkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {item.body}
                                    </p>
                                  )}
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt="News thumbnail"
                                      className="w-full h-32 object-cover rounded mt-2"
                                    />
                                  )}
                                  {item.url && (
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-xs md:text-sm underline ${
                                        darkMode
                                          ? "text-blue-400"
                                          : "text-blue-600"
                                      }`}
                                    >
                                      View Source
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }

                        return (
                          <ul className="list-none space-y-1 text-xs md:text-sm">
                            {renderBulletPoints(parsed)}
                          </ul>
                        );
                      } catch {
                        // Handle simple string results
                        if (typeof selectedTool.result === "string") {
                          return (
                            <div
                              className={`text-xs md:text-sm ${
                                darkMode ? "text-gray-200" : "text-gray-800"
                              }`}
                            >
                              {selectedTool.result}
                            </div>
                          );
                        }
                        return (
                          <pre
                            className={`text-xs font-mono whitespace-pre-wrap ${
                              darkMode ? "text-gray-200" : "text-gray-800"
                            }`}
                          >
                            {JSON.stringify(selectedTool.result, null, 2)}
                          </pre>
                        );
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
  );
}
