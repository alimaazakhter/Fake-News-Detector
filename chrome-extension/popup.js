// State & Default Configs
const DEFAULT_SERVER = "http://localhost:3000";

// DOM Elements
const views = {
  welcome: document.getElementById("welcome-view"),
  loading: document.getElementById("loading-view"),
  results: document.getElementById("results-view"),
  settings: document.getElementById("settings-view"),
  error: document.getElementById("error-view")
};

const serverUrlInput = document.getElementById("server-url");
const errorMessageEl = document.getElementById("error-message");

// Buttons
const scanBtn = document.getElementById("scan-btn");
const rescanBtn = document.getElementById("rescan-btn");
const settingsBtn = document.getElementById("settings-btn");
const saveSettingsBtn = document.getElementById("save-settings");
const errorRetryBtn = document.getElementById("error-retry-btn");

// Initialize Settings
let serverUrl = localStorage.getItem("truthshield_server") || DEFAULT_SERVER;
serverUrlInput.value = serverUrl;

// Event Listeners
scanBtn.addEventListener("click", scanCurrentPage);
rescanBtn.addEventListener("click", () => showView("welcome"));
errorRetryBtn.addEventListener("click", scanCurrentPage);

settingsBtn.addEventListener("click", () => {
  if (views.settings.classList.contains("hidden")) {
    showView("settings");
  } else {
    showView("welcome");
  }
});

saveSettingsBtn.addEventListener("click", () => {
  const inputVal = serverUrlInput.value.trim().replace(/\/$/, ""); // strip trailing slash
  if (inputVal) {
    serverUrl = inputVal;
    localStorage.setItem("truthshield_server", serverUrl);
  }
  showView("welcome");
});

// View Management Helper
function showView(targetViewId) {
  Object.keys(views).forEach(key => {
    if (key === targetViewId) {
      views[key].classList.remove("hidden");
    } else {
      views[key].classList.add("hidden");
    }
  });
}

// Scrape Page Script Function (Runs in page context)
function getPageTextContext() {
  // Grab main article tags or paragraphs to avoid headers/footers noise
  const articleNode = document.querySelector("article");
  if (articleNode) {
    const text = articleNode.innerText || articleNode.textContent || "";
    if (text.trim().length > 200) return text;
  }

  // Fallback: collect paragraphs
  const paragraphs = Array.from(document.querySelectorAll("p"));
  const collectedText = paragraphs
    .map(p => p.innerText || p.textContent || "")
    .map(t => t.trim())
    .filter(t => t.length > 20)
    .join("\n");

  if (collectedText.length > 300) {
    return collectedText;
  }

  // Absolute fallback: entire body text
  return document.body ? (document.body.innerText || document.body.textContent || "") : "";
}

// Main Scan Action
async function scanCurrentPage() {
  showView("loading");

  try {
    // 1. Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error("No active browser tab found.");
    }

    // 2. Inject scraping script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getPageTextContext
    });

    const pageText = results?.[0]?.result;
    if (!pageText || pageText.trim().length < 20) {
      throw new Error("Could not extract enough text content from this page to analyze.");
    }

    // 3. Request analysis from TruthShield Next.js server
    const response = await fetch(`${serverUrl}/api/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: pageText.slice(0, 10000) }) // truncate to fit standard headers
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || `Server responded with status ${response.status}.`);
    }

    const prediction = await response.json();
    renderResults(prediction);
    showView("results");
  } catch (err) {
    console.error("Scan error:", err);
    errorMessageEl.textContent = err.message || "Could not complete text analysis.";
    showView("error");
  }
}

// Render Results Helper
function renderResults(data) {
  const isReal = data.isReal;
  const confidence = data.confidence;

  // Update Anomaly Warning
  const anomalyWarningEl = document.getElementById("anomaly-warning");
  const anomalyWarningTextEl = document.getElementById("anomaly-warning-text");
  if (data.anomalyWarning) {
    anomalyWarningTextEl.textContent = data.anomalyWarning;
    anomalyWarningEl.classList.remove("hidden");
  } else {
    anomalyWarningEl.classList.add("hidden");
  }

  // 1. Update Gauge
  const gaugeFill = document.getElementById("gauge-fill");
  const scorePct = document.getElementById("score-percentage");
  const scoreLbl = document.getElementById("score-label");
  const headline = document.getElementById("result-headline");

  scorePct.textContent = `${confidence}%`;
  scoreLbl.textContent = isReal ? "REAL" : "FAKE";

  if (isReal) {
    gaugeFill.className.baseVal = "gauge-fill real";
    headline.textContent = "Credible Signature Detected";
    headline.className = "real-text";
  } else {
    gaugeFill.className.baseVal = "gauge-fill fake";
    headline.textContent = "Disinformation Style Detected";
    headline.className = "fake-text";
  }

  // Stroke Dash Array is 276.4 (r=44, 2 * pi * 44 = 276.4)
  const offset = 276.4 - (276.4 * confidence) / 100;
  gaugeFill.style.strokeDashoffset = offset;

  // 2. Update Progress Bars
  document.getElementById("credibility-val").textContent = `${confidence}%`;
  document.getElementById("credibility-bar").style.width = `${confidence}%`;
  // Set credibility bar color based on result
  document.getElementById("credibility-bar").className = `progress-bar ${isReal ? "fill-emerald" : "fill-rose"}`;

  const clickbait = data.stats?.clickbaitScore || 0;
  document.getElementById("clickbait-val").textContent = `${clickbait}%`;
  document.getElementById("clickbait-bar").style.width = `${clickbait}%`;

  const sensationalism = data.stats?.sensationalismScore || 0;
  document.getElementById("sensationalism-val").textContent = `${sensationalism}%`;
  document.getElementById("sensationalism-bar").style.width = `${sensationalism}%`;

  // 3. Update Emotional Stances
  document.getElementById("fear-val").textContent = `${data.sentiment?.fear || 0}%`;
  document.getElementById("anger-val").textContent = `${data.sentiment?.anger || 0}%`;
  document.getElementById("bias-val").textContent = `${data.sentiment?.bias || 0}%`;
}
