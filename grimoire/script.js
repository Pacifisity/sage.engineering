const libraryPath = "stories/stories-library.json";
const legacyIndexPath = "stories/story-index.json";
const readerStateKey = "grimoire.readerState.v1";
const hiddenStoryIds = new Set(["hero-of-tommorrow", "echo-chamber"]);

const storyListEl = document.getElementById("storyList");
const chapterSelectEl = document.getElementById("chapterSelect");
const prevChapterBtnEl = document.getElementById("prevChapterBtn");
const nextChapterBtnEl = document.getElementById("nextChapterBtn");
const focusModeBtnEl = document.getElementById("focusModeBtn");
const storyBodyEl = document.getElementById("storyBody");
const statusEl = document.getElementById("status");
const homeViewEl = document.getElementById("homeView");
const readerViewEl = document.getElementById("readerView");
const homeCardEl = document.getElementById("homeCard");

let library = [];
let filteredLibrary = [];
let activeStoryId = null;
let activeChapters = [];
let activeChapterIndex = 0;
let restoringScroll = false;

function getDefaultState() {
  return {
    storyId: null,
    chapterIndex: 0,
    chapterScroll: {},
    view: "home"
  };
}

function readState() {
  try {
    const raw = localStorage.getItem(readerStateKey);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);
    return {
      ...getDefaultState(),
      ...parsed,
      chapterScroll: parsed && typeof parsed.chapterScroll === "object" && parsed.chapterScroll ? parsed.chapterScroll : {}
    };
  } catch {
    return getDefaultState();
  }
}

function writeState(patch) {
  const current = readState();
  const next = {
    ...current,
    ...patch,
    chapterScroll: {
      ...current.chapterScroll,
      ...(patch.chapterScroll || {})
    }
  };
  localStorage.setItem(readerStateKey, JSON.stringify(next));
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function showHome() {
  setFocusMode(false);
  homeViewEl.classList.add("active");
  readerViewEl.classList.remove("active");
  writeState({ view: "home" });
}

function showReader() {
  homeViewEl.classList.remove("active");
  readerViewEl.classList.add("active");
  writeState({ view: "reader" });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseInline(text) {
  const safe = escapeHtml(text);
  return safe
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const html = [];

  let inCode = false;
  let inUl = false;
  let inOl = false;
  let paragraph = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      html.push(`<p>${parseInline(paragraph.join(" ").trim())}</p>`);
      paragraph = [];
    }
  }

  function closeLists() {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("```")) {
      flushParagraph();
      closeLists();
      if (!inCode) {
        inCode = true;
        html.push("<pre><code>");
      } else {
        inCode = false;
        html.push("</code></pre>");
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(rawLine)}\n`);
      continue;
    }

    if (!line) {
      flushParagraph();
      closeLists();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeLists();
      const level = heading[1].length;
      html.push(`<h${level}>${parseInline(heading[2])}</h${level}>`);
      continue;
    }

    if (/^[-*_]{3,}$/.test(line)) {
      flushParagraph();
      closeLists();
      html.push("<hr>");
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeLists();
      html.push(`<blockquote>${parseInline(quote[1])}</blockquote>`);
      continue;
    }

    const ulItem = line.match(/^[-*+]\s+(.+)$/);
    if (ulItem) {
      flushParagraph();
      if (!inUl) {
        if (inOl) {
          html.push("</ol>");
          inOl = false;
        }
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${parseInline(ulItem[1])}</li>`);
      continue;
    }

    const olItem = line.match(/^\d+\.\s+(.+)$/);
    if (olItem) {
      flushParagraph();
      if (!inOl) {
        if (inUl) {
          html.push("</ul>");
          inUl = false;
        }
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${parseInline(olItem[1])}</li>`);
      continue;
    }

    paragraph.push(rawLine.trim());
  }

  flushParagraph();
  closeLists();
  return html.join("\n");
}

function normalizeStory(story) {
  const normalized = {
    id: story.id,
    title: story.title,
    description: story.description || "",
    chapters: Array.isArray(story.chapters) ? [...story.chapters] : []
  };

  const pattern = story.chapterPattern;
  if (pattern && Number.isInteger(pattern.start) && Number.isInteger(pattern.end) && typeof pattern.pathTemplate === "string") {
    const chapters = [];
    for (let n = pattern.start; n <= pattern.end; n += 1) {
      const titleTemplate = pattern.titleTemplate || "Chapter {n}";
      chapters.push({
        title: titleTemplate.replace("{n}", String(n)),
        path: pattern.pathTemplate.replace("{n}", String(n))
      });
    }
    normalized.chapters = chapters;
  }

  return normalized;
}

function isVisibleStory(story) {
  return story && !hiddenStoryIds.has(story.id);
}

function chapterStateKey(storyId, chapterPath) {
  return `${storyId}::${chapterPath}`;
}

function saveCurrentScroll() {
  if (!activeStoryId || !activeChapters[activeChapterIndex] || !readerViewEl.classList.contains("active") || restoringScroll) {
    return;
  }
  const chapter = activeChapters[activeChapterIndex];
  const key = chapterStateKey(activeStoryId, chapter.path);
  writeState({ chapterScroll: { [key]: window.scrollY } });
}

let scrollSaveQueued = false;
window.addEventListener("scroll", () => {
  if (scrollSaveQueued) return;
  scrollSaveQueued = true;
  window.requestAnimationFrame(() => {
    saveCurrentScroll();
    scrollSaveQueued = false;
  });
});

function renderHomeCard(story) {
  if (!story) {
    homeCardEl.innerHTML = "<h3>No story selected</h3><p>Choose any story from the left to preview it.</p>";
    return;
  }

  const chapterCount = Array.isArray(story.chapters) ? story.chapters.length : 0;
  homeCardEl.innerHTML = `
    <h3>${escapeHtml(story.title)}</h3>
    <p>${escapeHtml(story.description || "No description yet.")}</p>
    <p>${chapterCount} chapter${chapterCount === 1 ? "" : "s"}</p>
    <button class="open-story-btn" type="button" data-story-id="${escapeHtml(story.id)}">Open Story</button>
  `;

  const openBtn = homeCardEl.querySelector(".open-story-btn");
  openBtn.addEventListener("click", () => {
    openStory(story.id);
  });
}

function renderStoryList() {
  storyListEl.innerHTML = "";

  if (filteredLibrary.length === 0) {
    storyListEl.innerHTML = "<p class=\"story-btn-meta\">No stories match this search.</p>";
    renderHomeCard(null);
    return;
  }

  filteredLibrary.forEach((story) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-btn";
    if (story.id === activeStoryId) {
      button.classList.add("active");
    }

    const chapterCount = Array.isArray(story.chapters) ? story.chapters.length : 0;
    button.innerHTML = `
      <p class="story-btn-title">${escapeHtml(story.title)}</p>
      <p class="story-btn-meta">${chapterCount} chapter${chapterCount === 1 ? "" : "s"}</p>
    `;
    button.addEventListener("click", () => {
      openStory(story.id);
    });
    storyListEl.appendChild(button);
  });

  const fallback = filteredLibrary.find((story) => story.id === activeStoryId) || filteredLibrary[0];
  activeStoryId = fallback.id;
  renderHomeCard(fallback);
}

async function loadChapter(chapterPath) {
  try {
    setStatus("Loading chapter...");
    const response = await fetch(encodeURI(chapterPath));
    if (!response.ok) {
      throw new Error(`Could not load ${chapterPath}`);
    }
    let markdown = await response.text();
    markdown = markdown.replace(/^\s*#{1,6}\s+.+\r?\n?/, "").replace(/^\s*\r?\n/, "");
    storyBodyEl.innerHTML = markdownToHtml(markdown);
    setStatus("");
  } catch (error) {
    storyBodyEl.textContent = "";
    setStatus(error.message, true);
  }
}

function updateNavState() {
  chapterSelectEl.value = String(activeChapterIndex);
  prevChapterBtnEl.disabled = activeChapterIndex <= 0;
  nextChapterBtnEl.disabled = activeChapterIndex >= activeChapters.length - 1;
}

function renderChapterList() {
  chapterSelectEl.innerHTML = "";
  activeChapters.forEach((chapter, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = chapter.title;
    chapterSelectEl.appendChild(option);
  });
}

async function loadChapterByIndex(index, options = {}) {
  const restore = Boolean(options.restore);
  if (index < 0 || index >= activeChapters.length) return;

  activeChapterIndex = index;
  const chapter = activeChapters[index];
  writeState({ storyId: activeStoryId, chapterIndex: index });

  updateNavState();
  await loadChapter(chapter.path);

  const state = readState();
  const key = chapterStateKey(activeStoryId, chapter.path);
  const savedY = typeof state.chapterScroll[key] === "number" ? state.chapterScroll[key] : 0;

  restoringScroll = true;
  window.scrollTo({ top: restore ? savedY : 0, behavior: "auto" });
  window.setTimeout(() => {
    restoringScroll = false;
  }, 0);
}

async function openStory(storyId, options = {}) {
  const selectedStory = library.find((story) => story.id === storyId);
  if (!selectedStory) {
    setStatus("Story not found.", true);
    return;
  }

  activeStoryId = selectedStory.id;
  activeChapters = Array.isArray(selectedStory.chapters) ? selectedStory.chapters : [];
  renderStoryList();

  if (activeChapters.length === 0) {
    chapterSelectEl.innerHTML = "";
    storyBodyEl.textContent = "This story does not have chapter entries yet.";
    showReader();
    return;
  }

  const requestedIndex = Number.isInteger(options.chapterIndex) ? options.chapterIndex : 0;
  const safeIndex = Math.min(Math.max(requestedIndex, 0), activeChapters.length - 1);

  renderChapterList();
  showReader();
  await loadChapterByIndex(safeIndex, { restore: Boolean(options.restore) });
}

async function loadLibrary() {
  try {
    setStatus("Loading stories...");
    const response = await fetch(libraryPath);

    if (response.ok) {
      const data = await response.json();
      library = Array.isArray(data.stories) ? data.stories.map(normalizeStory).filter(isVisibleStory) : [];
    } else {
      const legacyResponse = await fetch(legacyIndexPath);
      if (!legacyResponse.ok) {
        throw new Error("Missing stories library");
      }
      const legacyStory = await legacyResponse.json();
      library = [{
        id: "legacy-story",
        title: legacyStory.storyTitle || "Story",
        description: "Imported from story-index.json",
        chapters: Array.isArray(legacyStory.chapters) ? legacyStory.chapters : []
      }];
    }

    if (library.length === 0) {
      throw new Error("No stories were found in the library");
    }

    filteredLibrary = [...library];

    const saved = readState();
    const savedStory = library.find((story) => story.id === saved.storyId) || library[0];
    activeStoryId = savedStory.id;
    renderStoryList();

    if (saved.view === "reader") {
      await openStory(savedStory.id, {
        chapterIndex: saved.chapterIndex,
        restore: true
      });
    } else {
      showHome();
      setStatus("");
    }
  } catch (error) {
    setStatus(`${error.message}. Check stories/stories-library.json.`, true);
  }
}

chapterSelectEl.addEventListener("change", () => {
  loadChapterByIndex(parseInt(chapterSelectEl.value, 10), { restore: false });
});

prevChapterBtnEl.addEventListener("click", () => {
  loadChapterByIndex(activeChapterIndex - 1, { restore: false });
});

nextChapterBtnEl.addEventListener("click", () => {
  loadChapterByIndex(activeChapterIndex + 1, { restore: false });
});

function setFocusMode(enabled) {
  document.body.classList.toggle("focus-mode", enabled);
  focusModeBtnEl.classList.toggle("active", enabled);
  focusModeBtnEl.setAttribute("aria-pressed", enabled);
  focusModeBtnEl.textContent = enabled ? "Exit Full View" : "Full View";
}

focusModeBtnEl.addEventListener("click", () => {
  setFocusMode(!document.body.classList.contains("focus-mode"));
});

loadLibrary();
