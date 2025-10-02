import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretLeft, faCaretRight } from "@fortawesome/free-solid-svg-icons";

// Props interface for TradingView widget component
interface TradingViewWidgetProps {
  symbols: string[];
  darkMode: boolean;
}

// TradingView chart widget with theme support and navigation
export function TradingViewWidget({
  symbols,
  darkMode,
}: TradingViewWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const darkContainerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lightContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Create TradingView chart configurations for both themes
  const createChartConfig = (
    symbol: string,
    index: number,
    isDark: boolean
  ) => ({
    autosize: true,
    symbol: symbol,
    timezone: "Asia/Kolkata",
    theme: isDark ? "dark" : "light",
    style: "10",
    locale: "en",
    backgroundColor: isDark ? "#171717" : "#ffffff",
    gridColor: isDark ? "#404040" : "#e5e7eb",
    allow_symbol_change: true,
    hide_top_toolbar: true,
    hide_legend: false,
    hide_side_toolbar: true,
    hide_volume: false,
    save_image: false,
    extended_hours: false,
    range: "1M",
    show_popup_button: false,
    popup_width: "1000",
    popup_height: "650",
    withdateranges: true,
    details: true,
    hotlist: false,
    fundamental: false,
    percentage: false,
    container_id: `tradingview_chart_${isDark ? "dark" : "light"}_${index}`,
    width: "100%",
    height: "100%",
    support_host: "https://www.tradingview.com",
  });

  // Initialize TradingView charts for all symbols
  useEffect(() => {
    if (!symbols?.length) return;

    symbols.forEach((symbol, index) => {
      // Create dark theme chart
      const darkContainer = darkContainerRefs.current[index];
      if (darkContainer && darkContainer.children.length === 0) {
        const darkScript = document.createElement("script");
        darkScript.src =
          "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        darkScript.type = "text/javascript";
        darkScript.async = true;
        darkScript.innerHTML = JSON.stringify(
          createChartConfig(symbol, index, true)
        );
        darkContainer.appendChild(darkScript);
      }

      // Create light theme chart
      const lightContainer = lightContainerRefs.current[index];
      if (lightContainer && lightContainer.children.length === 0) {
        const lightScript = document.createElement("script");
        lightScript.src =
          "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        lightScript.type = "text/javascript";
        lightScript.async = true;
        lightScript.innerHTML = JSON.stringify(
          createChartConfig(symbol, index, false)
        );
        lightContainer.appendChild(lightScript);
      }
    });
  }, [symbols]);

  if (!symbols?.length) return null;

  return (
    <div className="w-full relative">
      <div
        className={`w-full h-124 mb-2 rounded-sm border-0 relative overflow-visible ${
          darkMode ? "border-[#525252]" : "border-[#d4d4d4]"
        }`}
      >
        {/* Chart containers */}
        <div className="absolute inset-0 rounded-sm overflow-hidden">
          {/* Dark theme charts */}
          {symbols.map((symbol, index) => (
            <div
              key={`dark-${symbol}`}
              ref={(el) => {
                darkContainerRefs.current[index] = el;
              }}
              className="w-full h-full"
              style={{
                display: darkMode && index === currentIndex ? "block" : "none",
              }}
            />
          ))}
          {/* Light theme charts */}
          {symbols.map((symbol, index) => (
            <div
              key={`light-${symbol}`}
              ref={(el) => {
                lightContainerRefs.current[index] = el;
              }}
              className="w-full h-full"
              style={{
                display: !darkMode && index === currentIndex ? "block" : "none",
              }}
            />
          ))}
        </div>

        {/* Navigation buttons for multiple symbols */}
        {symbols.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex(
                  (prev) => (prev - 1 + symbols.length) % symbols.length
                )
              }
              className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full px-3 py-2 backdrop-blur-sm hover:backdrop-blur-none rounded-l-lg border transition-all z-10"
              style={{
                backgroundColor: darkMode
                  ? "rgba(64, 64, 64, 0.75)"
                  : "rgba(229, 229, 229, 0.75)",
                borderColor: darkMode ? "#525252" : "#d4d4d4",
                color: darkMode ? "#ffffff" : "#171717",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = darkMode
                  ? "#525252"
                  : "#d4d4d4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = darkMode
                  ? "rgba(64, 64, 64, 0.75)"
                  : "rgba(229, 229, 229, 0.75)")
              }
            >
              <FontAwesomeIcon icon={faCaretLeft} />
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev + 1) % symbols.length)
              }
              className="absolute top-1/2 -translate-y-1/2 right-0 translate-x-full px-3 py-2 backdrop-blur-sm hover:backdrop-blur-none rounded-r-lg border transition-all z-10"
              style={{
                backgroundColor: darkMode
                  ? "rgba(64, 64, 64, 0.75)"
                  : "rgba(229, 229, 229, 0.75)",
                borderColor: darkMode ? "#525252" : "#d4d4d4",
                color: darkMode ? "#ffffff" : "#171717",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = darkMode
                  ? "#525252"
                  : "#d4d4d4")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = darkMode
                  ? "rgba(64, 64, 64, 0.75)"
                  : "rgba(229, 229, 229, 0.75)")
              }
            >
              <FontAwesomeIcon icon={faCaretRight} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
