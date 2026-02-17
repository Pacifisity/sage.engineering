const QUOTE_DISABLED_KEY = "flow.quote.disabled";
let currentQuote = "";

export function shouldHideQuote() {
  return localStorage.getItem(QUOTE_DISABLED_KEY) === "true";
}

export function getCurrentQuote() {
  return currentQuote;
}

export function isQuoteDisabled() {
  return localStorage.getItem(QUOTE_DISABLED_KEY) === "true";
}

export function enableQuotes() {
  localStorage.removeItem(QUOTE_DISABLED_KEY);
}

export function disableQuotes() {
  localStorage.setItem(QUOTE_DISABLED_KEY, "true");
  currentQuote = "";
}

export function updateQuoteToggleButton(btn) {
  if (!btn) {
    return;
  }
  const isDisabled = isQuoteDisabled();
  btn.textContent = isDisabled ? "Enable quotes" : "Disable quotes";
}

export async function loadFocusQuote(dom, onQuoteLoaded) {
  if (!dom.focusQuote) {
    return;
  }

  // Hide the quote display element since quotes are now in the notes placeholder
  dom.focusQuote.classList.add("hidden");
  dom.focusQuote.innerHTML = "";

  if (shouldHideQuote()) {
    currentQuote = "";
    if (onQuoteLoaded) onQuoteLoaded();
    return;
  }

  const setQuote = (quote, author) => {
    currentQuote = quote;
    // Quote is no longer displayed here - it's now in the notes placeholder
    if (onQuoteLoaded) onQuoteLoaded();
  };

  const fallbackText = () => {
    setQuote(
      "Focus on the next small step. You are closer than you think.",
      ""
    );
  };

  const fetchQuote = async (url, transform) => {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Quote request failed");
    }
    const data = await response.json();
    return transform(data);
  };

  try {
    const localQuotes = await fetchQuote("data/quotes.json", (data) => data);
    if (!Array.isArray(localQuotes) || localQuotes.length === 0) {
      throw new Error("No local quotes");
    }
    // Calculate day of year (1-365/366)
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const diff = now - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    // Find quote for today, or fallback to first quote
    const localEntry = localQuotes.find((q) => q.day === dayOfYear) || localQuotes[0];
    setQuote(localEntry.quote, localEntry.author || "");
  } catch (error) {
    fallbackText();
  }
}
