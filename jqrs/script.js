const LOCAL_CSV_FILE = "Senior JQR Answersheet - Form Responses 1.csv";
const REMOTE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQRYbKt6ifGQgfgfSJDLvzVQQWBOM_bdHPte2R_PM0GgeoBU_LSBk7ZdofTeWkw9HnbcpUuBOWJzFiH/pub?output=csv";
const REPORT_WEBHOOK_URL =
  "https://script.google.com/macros/s/AKfycbzAfkQ8BSM4tc6CX4xFBf-3UgRjwor02C7ZE2iTHlQtoPQqiEL2hLu59zufn6yO0B-pOw/exec";
const REFRESH_INTERVAL_MS = 30000;
const LOCAL_FLAG_OVERRIDE_MS = 5 * 60 * 1000;
const FLAG_OVERRIDE_STORAGE_KEY = "jqrsFlagOverrideExpiresByKeyV1";

const searchInput = document.getElementById("searchInput");
const statusText = document.getElementById("statusText");
const cardsContainer = document.getElementById("cardsContainer");
const cardTemplate = document.getElementById("cardTemplate");
const loadingBar = document.getElementById("loadingBar");

let allCards = [];
let lastDataFingerprint = "";
let isRefreshing = false;
let shouldAnimateCards = true;
const pendingFlagKeys = new Set();
const locallyHiddenFlagState = new Map();
const hideTimeoutByKey = new Map();
const flagOverrideExpiresAtByKey = new Map();

loadFlagOverridesFromStorage();
init();

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

async function init() {
  try {
    loadingBar.classList.add("active");
    updateProgress(10);
    const result = await refreshCardsFromSource();
    updateProgress(100);

    if (result === "no-data") {
      setStatus("No response data found.");
      return;
    }

    if (result === "no-cards") {
      setStatus("No non-empty answers available yet.");
      return;
    }

    await delay(200);
    renderActiveView();

    setInterval(() => {
      void refreshCardsFromSource();
    }, REFRESH_INTERVAL_MS);
  } catch (error) {
    setStatus("Failed to load study data.");
    cardsContainer.innerHTML = "";
    const message = document.createElement("p");
    message.className = "status";
    message.textContent = `Error: ${error.message}`;
    cardsContainer.appendChild(message);
    updateProgress(100);
  } finally {
    loadingBar.classList.remove("active");
    loadingBar.classList.add("complete");
  }
}

async function refreshCardsFromSource() {
  if (isRefreshing) {
    return "skipped";
  }

  isRefreshing = true;
  try {
    const csvText = await loadCSVText();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
      return "no-data";
    }

    const headers = rows[0].map((header) => header.trim());
    const dataRows = rows.slice(1);
    const cards = buildCardsFromRows(headers, dataRows);

    if (cards.length === 0) {
      return "no-cards";
    }

    const newFingerprint = createCardsFingerprint(cards);
    if (newFingerprint === lastDataFingerprint) {
      return "unchanged";
    }

    const previousCount = allCards.length;
    allCards = cards;
    prunePendingFlags();
    reconcileLocallyHiddenFlags();
    lastDataFingerprint = newFingerprint;
    renderActiveView();

    const newCount = allCards.length - previousCount;
    if (newCount > 0) {
      setStatus(`Added ${newCount} new entr${newCount === 1 ? "y" : "ies"}.`);
    }

    return "updated";
  } finally {
    isRefreshing = false;
  }
}

function createCardsFingerprint(cards) {
  return cards
    .map((card) => `${card.timestampText}||${card.question}||${card.answer}`)
    .join("@@");
}

function createCardKey(card) {
  return `${(card.timestampText || "").trim()}||${(card.question || "").trim()}`;
}

function persistFlagOverridesToStorage() {
  try {
    const entries = Array.from(flagOverrideExpiresAtByKey.entries());
    localStorage.setItem(FLAG_OVERRIDE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
  }
}

function loadFlagOverridesFromStorage() {
  try {
    const raw = localStorage.getItem(FLAG_OVERRIDE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    const now = Date.now();
    let changed = false;

    parsed.forEach((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        changed = true;
        return;
      }

      const [key, expiresAt] = entry;
      if (typeof key !== "string" || typeof expiresAt !== "number") {
        changed = true;
        return;
      }

      if (expiresAt <= now) {
        changed = true;
        return;
      }

      flagOverrideExpiresAtByKey.set(key, expiresAt);
      pendingFlagKeys.add(key);
      locallyHiddenFlagState.set(key, true);
    });

    if (changed) {
      persistFlagOverridesToStorage();
    }
  } catch {
  }
}

function hasActiveFlagOverride(key) {
  const expiresAt = flagOverrideExpiresAtByKey.get(key);
  if (!expiresAt) {
    return false;
  }

  if (expiresAt <= Date.now()) {
    flagOverrideExpiresAtByKey.delete(key);
    pendingFlagKeys.delete(key);
    locallyHiddenFlagState.delete(key);
    persistFlagOverridesToStorage();
    return false;
  }

  return true;
}

function startFlagOverride(key) {
  const expiresAt = Date.now() + LOCAL_FLAG_OVERRIDE_MS;
  flagOverrideExpiresAtByKey.set(key, expiresAt);
  pendingFlagKeys.add(key);
  persistFlagOverridesToStorage();
}

function prunePendingFlags() {
  if (pendingFlagKeys.size === 0 && flagOverrideExpiresAtByKey.size === 0) {
    return;
  }

  const now = Date.now();
  let changed = false;

  for (const [key, expiresAt] of flagOverrideExpiresAtByKey.entries()) {
    if (expiresAt <= now) {
      flagOverrideExpiresAtByKey.delete(key);
      pendingFlagKeys.delete(key);
      locallyHiddenFlagState.delete(key);
      changed = true;
    }
  }

  if (changed) {
    persistFlagOverridesToStorage();
  }
}

function reconcileLocallyHiddenFlags() {
  if (locallyHiddenFlagState.size === 0) {
    return;
  }

  for (const key of locallyHiddenFlagState.keys()) {
    if (!hasActiveFlagOverride(key)) {
      locallyHiddenFlagState.delete(key);
    }
  }
}

function renderActiveView() {
  const term = (searchInput?.value || "").trim();
  if (!term) {
    renderCards(applyLocalHiddenFilter(allCards));
    return;
  }

  const filtered = rankAndFilterCards(allCards, term);
  renderCards(applyLocalHiddenFilter(filtered));
}

function applyLocalHiddenFilter(cards) {
  if (locallyHiddenFlagState.size === 0) {
    return cards;
  }

  return cards.filter((card) => {
    const key = createCardKey(card);
    if (!locallyHiddenFlagState.has(key)) {
      return true;
    }

    return !hasActiveFlagOverride(key);
  });
}

function updateProgress(percent) {
  loadingBar.style.width = percent + "%";
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadCSVText() {
  const cacheBustedRemoteUrl = `${REMOTE_CSV_URL}&t=${Date.now()}`;
  const remoteResponse = await fetch(cacheBustedRemoteUrl, { cache: "no-store" });
  if (remoteResponse.ok) {
    return remoteResponse.text();
  }

  throw new Error(`Unable to fetch CSV (${remoteResponse.status})`);
}

searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim();
  if (!term) {
    renderCards(applyLocalHiddenFilter(allCards));
    setStatus(`Showing all ${allCards.length} ${allCards.length === 1 ? "entry" : "entries"} (timestamp order).`);
    return;
  }

  const filtered = rankAndFilterCards(allCards, term);
  renderCards(applyLocalHiddenFilter(filtered));
  setStatus(`Found ${filtered.length} result${filtered.length === 1 ? "" : "s"} for "${term}".`);
});

cardsContainer.addEventListener("click", async (event) => {
  const rawTarget = event.target;
  const targetElement = rawTarget instanceof Element ? rawTarget : rawTarget?.parentElement;
  if (!(targetElement instanceof Element)) {
    return;
  }

  const button = targetElement.closest(".report-btn");
  if (!button) {
    return;
  }

  const timestamp = (button.dataset.timestamp || "").trim();
  const question = (button.dataset.question || "").trim();
  const answer = button.dataset.answer || "";
  if (!timestamp || !question) {
    return;
  }

  const cardKey = createCardKey({ timestampText: timestamp, question });
  if (hasActiveFlagOverride(cardKey)) {
    return;
  }

  const reportReasonInput = window.prompt("What is wrong with this card?");
  if (reportReasonInput === null) {
    return;
  }

  const reportReason = reportReasonInput.trim();
  if (!reportReason) {
    setStatus("Please enter what is wrong with the card before flagging.");
    return;
  }

  startFlagOverride(cardKey);

  button.disabled = true;
  button.textContent = "⏳";

  try {
    const startedAt = Date.now();
    const cardData = { timestampText: timestamp, question, answer };
    await submitReport(cardData, reportReason);
    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < 700) {
      await delay(700 - elapsedMs);
    }

    if (hideTimeoutByKey.has(cardKey)) {
      clearTimeout(hideTimeoutByKey.get(cardKey));
    }

    const hideTimeoutId = setTimeout(() => {
      hideTimeoutByKey.delete(cardKey);
      if (!hasActiveFlagOverride(cardKey)) {
        return;
      }

      locallyHiddenFlagState.set(cardKey, true);
      renderActiveView();
    }, 1000);
    hideTimeoutByKey.set(cardKey, hideTimeoutId);

    button.disabled = true;
    button.textContent = "⏳";
    setStatus("Response flagged. Checking for sheet update...");
    renderActiveView();
    queuePostFlagRefreshes();
  } catch (error) {
    if (hideTimeoutByKey.has(cardKey)) {
      clearTimeout(hideTimeoutByKey.get(cardKey));
      hideTimeoutByKey.delete(cardKey);
    }
    flagOverrideExpiresAtByKey.delete(cardKey);
    persistFlagOverridesToStorage();
    locallyHiddenFlagState.delete(cardKey);
    pendingFlagKeys.delete(cardKey);
    button.disabled = false;
    button.textContent = "🚩";
    renderActiveView();
    setStatus("Could not submit flag right now. Please try again.");
  }
});

function buildCardsFromRows(headers, rows) {
  const timestampIndex = findHeaderIndex(headers, "timestamp");
  const questionTypeIndex = findHeaderIndex(headers, "question type");
  const reportsIndex = findReportsColumnIndex(headers);
  const qaPairs = getQuestionAnswerPairs(headers);
  const cards = [];

  rows.forEach((row) => {
    const reportValue = reportsIndex >= 0 ? (row[reportsIndex] || "").trim() : "";
    if (isReportedValue(reportValue)) {
      return;
    }

    const timestampText = timestampIndex >= 0 ? (row[timestampIndex] || "").trim() : "";
    const questionType = questionTypeIndex >= 0 ? (row[questionTypeIndex] || "").trim() : "";

    const filledPairs = qaPairs.filter((pair) => {
      const question = (row[pair.questionIndex] || "").trim();
      const answer = (row[pair.answerIndex] || "").trim();
      return question && answer;
    });

    if (filledPairs.length === 0) {
      return;
    }

    const selectedPair = selectPairByQuestionType(filledPairs, questionType);
    const question = (row[selectedPair.questionIndex] || "").trim();
    const answer = (row[selectedPair.answerIndex] || "").trim();

    cards.push({
      question,
      answer,
      questionType,
      typeKey: getQuestionTypeKey(questionType),
      answerLines: getAnswerLines(answer),
      matchPairs: parseMatchPairs(answer),
      timestampValue: toTimestampValue(timestampText),
      timestampText,
      searchText: `${question} ${answer}`.toLowerCase()
    });
  });

  return cards.sort((a, b) => b.timestampValue - a.timestampValue);
}

function queuePostFlagRefreshes() {
  const delaysMs = [1200, 4000, 8000, 15000];
  delaysMs.forEach((delayMs) => {
    setTimeout(() => {
      void refreshCardsFromSource();
    }, delayMs);
  });
}

function getQuestionAnswerPairs(headers) {
  const pairs = [];

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const parsedQuestion = parseQuestionHeader(header);
    if (!parsedQuestion) {
      continue;
    }

    const answerIndex = findMatchingAnswerIndex(
      headers,
      parsedQuestion.suffix,
      parsedQuestion.kind
    );
    if (answerIndex === -1) {
      continue;
    }

    pairs.push({
      questionIndex: index,
      answerIndex,
      suffix: parsedQuestion.suffix
    });
  }

  return pairs;
}

function parseQuestionHeader(header) {
  const trimmed = (header || "").trim();
  if (/^question(?:\s+\([^)]*\))?$/i.test(trimmed)) {
    return { suffix: extractSuffix(trimmed), kind: "standard" };
  }

  if (/^match question(?:\s+\([^)]*\))?$/i.test(trimmed)) {
    return { suffix: extractSuffix(trimmed), kind: "match" };
  }

  if (/^match prompt(?:\s+\([^)]*\))?$/i.test(trimmed)) {
    return { suffix: extractSuffix(trimmed), kind: "match" };
  }

  return null;
}

function findMatchingAnswerIndex(headers, suffix, questionKind = "standard") {
  const preferCombined = questionKind === "match";

  const standardIndex = findAnswerIndexByPattern(
    headers,
    suffix,
    /^answers?(?:\s+\([^)]*\))?$/i
  );
  const combinedIndex = findAnswerIndexByPattern(
    headers,
    suffix,
    /^questions?\s*\|\s*answers?(?:\s+\([^)]*\))?$/i
  );

  if (preferCombined) {
    if (combinedIndex !== -1) {
      return combinedIndex;
    }
    return standardIndex;
  }

  if (standardIndex !== -1) {
    return standardIndex;
  }

  return combinedIndex;
}

function findAnswerIndexByPattern(headers, suffix, pattern) {
  for (let index = 0; index < headers.length; index += 1) {
    const candidate = (headers[index] || "").trim();

    if (pattern.test(candidate) && extractSuffix(candidate) === suffix) {
      return index;
    }
  }

  return -1;
}

function extractSuffix(header) {
  const match = /\(([^)]+)\)\s*$/.exec(header);
  return match ? match[1].trim().toUpperCase() : "";
}

function findHeaderIndex(headers, target) {
  return headers.findIndex((header) => header.trim().toLowerCase() === target);
}

function isReportedValue(value) {
  return String(value || "").trim().length > 0;
}

function findReportsColumnIndex(headers) {
  return headers.findIndex((header) => normalizeHeaderName(header) === "flags");
}

function normalizeHeaderName(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function selectPairByQuestionType(pairs, questionType) {
  const code = questionTypeToCode(questionType);
  if (!code) {
    return pairs[0];
  }

  return pairs.find((pair) => pair.suffix === code) || pairs[0];
}

function questionTypeToCode(questionType) {
  const normalized = (questionType || "").trim().toLowerCase();

  if (normalized.includes("match")) {
    return "M";
  }

  if (normalized.includes("multiple") && normalized.includes("answer")) {
    return "M";
  }

  if (normalized.includes("order") && normalized.includes("answer")) {
    return "O";
  }

  if (normalized.includes("single") && normalized.includes("answer")) {
    return "S";
  }

  if (normalized.includes("open") || normalized.includes("other")) {
    return "O";
  }

  return "";
}

function toTimestampValue(timestampText) {
  const parsedValue = Date.parse(timestampText);
  if (!Number.isNaN(parsedValue)) {
    return parsedValue;
  }

  return 0;
}

function rankAndFilterCards(cards, term) {
  const query = term.toLowerCase();

  return cards
    .map((card) => {
      const score = fuzzyScore(card.searchText, query);
      return { card, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.card.timestampValue - a.card.timestampValue;
    })
    .map((item) => item.card);
}

function fuzzyScore(text, query) {
  if (!query) {
    return 1;
  }

  if (text.includes(query)) {
    return 1000 + query.length * 5;
  }

  const words = query.split(/\s+/).filter(Boolean);
  let wordScore = 0;

  for (const word of words) {
    if (text.includes(word)) {
      wordScore += 30 + word.length;
    }
  }

  const sequentialScore = subsequenceMatchScore(text, query);
  return wordScore + sequentialScore;
}

function subsequenceMatchScore(text, query) {
  let textIndex = 0;
  let matches = 0;

  for (const character of query) {
    textIndex = text.indexOf(character, textIndex);
    if (textIndex === -1) {
      return 0;
    }
    matches += 1;
    textIndex += 1;
  }

  return matches * 2;
}

function renderCards(cards) {
  cardsContainer.innerHTML = "";

  if (cards.length === 0) {
    const empty = document.createElement("p");
    empty.className = "status";
    empty.textContent = "No matching cards found.";
    cardsContainer.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  const animateThisRender = shouldAnimateCards;

  for (let index = 0; index < cards.length; index += 1) {
    const cardData = cards[index];
    const cardElement = cardTemplate.content.firstElementChild.cloneNode(true);
    cardElement.classList.add(`card-${cardData.typeKey}`);

    if (animateThisRender && index < 10) {
      // Progressively faster animation: 0.5s to 0.05s
      const duration = 0.5 - (index * 0.05);
      cardElement.style.animation = `fadeInUp ${duration}s ease forwards`;
      cardElement.style.animationDelay = "0s";
    } else {
      // No animation, just appear
      cardElement.style.animation = "none";
      cardElement.style.opacity = "1";
    }
    
    cardElement.querySelector(".type-badge").textContent = formatQuestionTypeDisplay(cardData.questionType);
    const timestampElement = cardElement.querySelector(".timestamp");
    cardElement.querySelector(".question").textContent = cardData.question;
    renderAnswerByType(cardElement.querySelector(".answer"), cardData);

    const reportButton = document.createElement("button");
    reportButton.type = "button";
    reportButton.className = "report-btn";
    reportButton.dataset.timestamp = cardData.timestampText;
    reportButton.dataset.question = cardData.question;
    reportButton.dataset.answer = cardData.answer;
    const cardKey = createCardKey(cardData);
    const isPendingFlag = hasActiveFlagOverride(cardKey);
    reportButton.textContent = isPendingFlag ? "⏳" : "🚩";
    reportButton.setAttribute("aria-label", "Flag this response");
    reportButton.title = "Flag this response";
    reportButton.disabled = isPendingFlag;
    timestampElement.replaceWith(reportButton);

    fragment.appendChild(cardElement);
  }

  cardsContainer.appendChild(fragment);
  shouldAnimateCards = false;
}

function parseCSV(input) {
  const rows = [];
  let currentCell = "";
  let currentRow = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const nextChar = input[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      currentRow.push(currentCell);
      currentCell = "";

      if (currentRow.some((cell) => cell.trim() !== "")) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some((cell) => cell.trim() !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function renderAnswerByType(container, cardData) {
  container.innerHTML = "";

  if (cardData.typeKey === "multiple") {
    const list = document.createElement("ul");
    list.className = "answer-list";
    cardData.answerLines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.appendChild(item);
    });
    container.appendChild(list);
    return;
  }

  if (cardData.typeKey === "match") {
    const list = document.createElement("div");
    list.className = "match-list";

    if (cardData.matchPairs.length > 0) {
      cardData.matchPairs.forEach((pair) => {
        const row = document.createElement("div");
        row.className = "match-row";

        const left = document.createElement("p");
        left.className = "match-left";
        left.textContent = pair.left;

        const right = document.createElement("p");
        right.className = "match-right";
        right.textContent = pair.right;

        row.append(left, right);
        list.appendChild(row);
      });
    } else {
      const fallback = document.createElement("p");
      fallback.className = "answer-text";
      fallback.textContent = cardData.answer;
      list.appendChild(fallback);
    }

    container.appendChild(list);
    return;
  }

  if (cardData.typeKey === "order") {
    const list = document.createElement("ol");
    list.className = "answer-list";
    cardData.answerLines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line.replace(/^\s*\d+[.)]\s*/, "");
      list.appendChild(item);
    });
    container.appendChild(list);
    return;
  }

  const paragraph = document.createElement("p");
  paragraph.className = "answer-text";
  paragraph.textContent = cardData.answer;
  container.appendChild(paragraph);
}

function getQuestionTypeKey(questionType) {
  const normalized = (questionType || "").trim().toLowerCase();

  if (normalized.includes("match")) {
    return "match";
  }

  if (normalized.includes("multiple") && normalized.includes("answer")) {
    return "multiple";
  }

  if (normalized.includes("order") && normalized.includes("answer")) {
    return "order";
  }

  if (normalized.includes("single") && normalized.includes("answer")) {
    return "single";
  }

  return "default";
}

function parseMatchPairs(answer) {
  return getAnswerLines(answer)
    .map((line) => {
      const splitIndex = line.indexOf("|");
      if (splitIndex === -1) {
        return null;
      }

      return {
        left: line.slice(0, splitIndex).trim(),
        right: line.slice(splitIndex + 1).trim()
      };
    })
    .filter((pair) => pair && pair.left && pair.right);
}

function getAnswerLines(answer) {
  return (answer || "")
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatTimestamp(timestampText) {
  const date = new Date(timestampText);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function formatQuestionTypeDisplay(questionType) {
  const normalized = (questionType || "").trim().toLowerCase();
  
  if (normalized.includes("match")) {
    return "Match";
  }
  
  if (normalized.includes("multiple")) {
    return "Multiple";
  }
  
  if (normalized.includes("order")) {
    return "Order";
  }
  
  if (normalized.includes("single")) {
    return "Single";
  }
  
  return questionType || "Unknown";
}

async function submitReport(cardData, reportReason) {
  const payload = {
    timestamp: cardData.timestampText,
    question: cardData.question,
    reported: reportReason,
    reportReason,
    reportedAt: new Date().toISOString()
  };

  const formBody = new URLSearchParams(payload).toString();

  if (typeof navigator.sendBeacon === "function") {
    const beaconPayload = new Blob([formBody], {
      type: "application/x-www-form-urlencoded;charset=UTF-8"
    });
    const sent = navigator.sendBeacon(REPORT_WEBHOOK_URL, beaconPayload);
    if (sent) {
      return;
    }
  }

  throw new Error("Flag submit unavailable in this browser session.");
}
