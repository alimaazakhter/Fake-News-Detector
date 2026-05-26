# TruthShield AI — Advanced Misinformation Firewall & Cyber-Analytics Platform

> **Project Title:** TruthShield AI (Debiased Machine Learning Classifier + Common-Sense Anomaly Detection + Chrome Extension)  
> **Developed by:** Alimaaz Akhter  
> **Acknowledgement:** Originally conceived and developed during my Data Science & ML internship at **Technest**.

TruthShield AI is a premium, professional cyber-analytics dashboard designed to detect, analyze, and explain the credibility of news articles. Rather than relying solely on database lookups, the system uses a **debiased machine learning model** running entirely **client-side** combined with a lightweight **Common-Sense Anomaly Detection Layer** to evaluate writing signatures, clickbait heuristics, and factually impossible claims in real-time.

---

## 🌟 Platform Overview & Core Features

* **Hybrid Verification Architecture:** Integrates a local client-side ML model (TF-IDF + Logistic Regression) with a rule-based **Common-Sense Anomaly Detection Layer** for robust, logical filtering.
* **Explainability Panel (LIME/SHAP style):** Visualizes the specific terms driving the model's prediction, color-coded by positive contribution (real signals) and negative contribution (fake signals).
* **Live Claim Verification:** Real-time cross-referencing with external fact-check databases using the Google Fact Check API.
* **Linguistic Heuristics Panel:** Instantly parses reading metrics, sensationalism indexes, clickbait percentages, and structural attributes.
* **Chrome Extension Support:** Real-time page scraping and classification directly from the browser toolbar, connected via a unified API.
* **Premium Dark Cybersecurity Theme:** Modern obsidian/carbon glassmorphic dashboard styled with responsive CSS grids, floating gradient glows, tooltips, and micro-animations.

---

## 📂 Repository Structure

```
fake-news-detector/
├── ml/
│   ├── data/                 # Raw datasets (Fake.csv, True.csv)
│   └── train_model.py        # Python debiasing pipeline & model trainer
├── public/
│   └── model_metadata.json   # Exported vocabulary, IDF weights & LR coefficients
├── lib/
│   ├── anomaly.ts            # Common-sense anomaly detection regex rules
│   ├── predictor.ts          # Core TF-IDF math and hybrid prediction compiler
│   ├── sentiment.ts          # Sentiment analysis and psychological stance metrics
│   ├── verdict.ts            # Verdict compiler logic mapping output states
│   └── test_anomaly.ts       # (Temporary) Anomaly execution verification script
├── app/
│   ├── api/
│   │   ├── fact-check/       # Proxy API calling Google Fact Check API
│   │   ├── scrape/           # Web crawler parsing URL article text
│   │   └── verify/           # API endpoint serving Chrome Extension queries
│   ├── globals.css           # Tailwind v4 directives and grid animations
│   ├── layout.tsx            # Global SEO headers and Space Grotesk typography
│   └── page.tsx              # Main dashboard frontend interface
├── chrome-extension/
│   ├── manifest.json         # Extension Manifest V3 configuration
│   ├── popup.html            # Extension popup markup
│   ├── popup.css             # Extension glowing dark styles
│   └── popup.js              # Extension scrapers and API verify routing
├── package.json              # Next.js 16 + React 19 + Tailwind configuration
├── tsconfig.json             # TypeScript compiler settings
└── README.md                 # Project documentation
```

---

## 🔬 Machine Learning Pipeline & Debiasing

Traditional models trained on news datasets learn to look for publisher signatures (like `"Reuters"` or location headers like `"WASHINGTON (Reuters) -"`) rather than actual linguistic style. TruthShield AI corrects this through a **debiased NLP training pipeline** in `ml/train_model.py`:

1. **Header Stripping:** Automatically removes location/agency patterns (e.g. `^[CITY] (Reuters) -`) from the beginning of the text during preprocessing.
2. **Attribution Stop-Words:** Injects common dataset shortcut words into the TF-IDF stop-words list so the model cannot use them as indicators:
   ```python
   custom_stop_words = [
       'reuters', 'said', 'tuesday', 'wednesday', 'thursday', 'friday', 
       'monday', 'sunday', 'saturday', 'washington', 'london', 'image', 
       'images', 'photo', 'via', 'featured', 'caption', 'read', 'photo'
   ]
   ```
3. **Training & Export:** Fits a `TfidfVectorizer` (limited to 5,000 features for optimal browser performance) and a `LogisticRegression` classifier, exporting the parameters directly to a JSON payload.

### Model Performance (Debiased)
```
Accuracy: 97.60%

Classification Report:
              precision    recall  f1-score   support

        FAKE       0.98      0.96      0.97      2474
        REAL       0.97      0.99      0.98      2973
```

---

## 🧠 Common-Sense Anomaly Detection Layer

While machine learning models excel at detecting structural style signatures, they lack factual awareness. For example, the claim *"Cristiano Ronaldo buys the moon for $2 billion"* is written in a professional news wire style, which can cause ML models to classify it as "REAL."

TruthShield AI solves this by implementing a **Common-Sense Anomaly Detection Layer** (`lib/anomaly.ts`) on top of the classifier.

### 1. Categories Detected
* **Celebrity/Billionaire Celestial Transactions:** Exaggerated transactions (e.g., Taylor Swift buying Mars).
* **Supernatural & Aliens:** Unrealistic political/social events (e.g., *"Aliens elected as presidents"*).
* **Biological Impossibilities:** Absurd human survival claims (e.g., sleeping without breathing for 10 years).
* **Miracle Cures:** Unscientific health claims (e.g., curing cancer instantly with herbs).
* **Cosmic Doomsday Scenarios:** World-ending, sensationalist alerts (e.g., *"Asteroid will destroy the earth tomorrow"*).
* **Unrealistic Science:** Impossible cloning/genetic events.

### 2. Hybrid Logic Integration
When an anomaly is triggered:
* **Fake Probability Penalty:** Subtracts **`0.65`** from the model's `realProbability` (reducing real probability to `< 5%` and forcing a high-confidence FAKE style prediction).
* **Sensationalism Index Boost:** Increases the sensationalism score by **`+40%`**.
* **Suspicious Verdict:** Directly overrides the verdict to **`SUSPICIOUS`** with warning reasons.
* **UI Warning Badge:** Displays an amber warning banner:
  > ⚠️ **Potential unrealistic or factually impossible claim detected.**

---

## 🧮 Explainability & Heuristics Breakdown

### 1. Credibility Indicator
Displays the final verdict state:
* **`TRUSTED`:** High styling credibility, emotional neutrality, balanced objective framing.
* **`LIKELY REAL`:** Structurally credible writing, minor sensationalism.
* **`SUSPICIOUS`:** Opinionated bias, common-sense anomalies, or outrage metrics.
* **`POSSIBLY MANIPULATED`:** Moderate clickbait, questionable linguistic signatures.
* **`HIGH RISK`:** Low ML credibility, high clickbait, extreme emotional alarmism.

### 2. Sentiment Stance Profile
Analyzes emotional stance and neutrality:
* **Tone Integrity:** The overall degree of objective and neutral writing patterns.
* **Alarmism / Fear:** Detects verbs, adjectives, and nouns that induce panic or fear.
* **Hostility / Anger:** Measures outrage-triggering words often used in clickbait.
* **Certainty / Bias:** Tracks absolute declarations (e.g. *always*, *never*, *must*) and editorial bias.

### 3. Linguistic Heuristics
* **Word Count & Reading Time:** Estimates length and reading speed.
* **Clickbait Score:** Checks for start-patterns (e.g. *"You won't believe..."*), excessive punctuation, and all-caps text.
* **Sensationalism Index:** Tracks the density of hyperbole and outrage modifiers.

### 4. Top Word Indicators (Model Weights)
A SHAP/LIME-like breakdown showing how individual words influenced the model. Green bars indicate real-wire attributes, and red bars indicate fake-news attributes.

---

## 🌐 Connected APIs

* **Google Fact Check API Proxy (`/api/fact-check`):** Used to query verified claim ratings from databases (like Snopes and PolitiFact) without exposing private API keys.
* **URL Scraper API (`/api/scrape`):** Uses `@mozilla/readability` and `linkedom` server-side to extract clean article text from any URL, stripping headers, scripts, and sidebar noise.
* **Verify Endpoint (`/api/verify`):** A CORS-enabled endpoint (`Access-Control-Allow-Origin: *`) allowing the Chrome Extension to run verification scripts on any page context.

---

## 🔌 Chrome Extension Setup

The repository includes a ready-to-run **Manifest V3 Chrome Extension** (`chrome-extension/`) that lets users scan articles on any webpage.

### 1. Installation
1. Open Google Chrome.
2. Go to **`chrome://extensions/`**.
3. Toggle on **`Developer mode`** in the top-right.
4. Click **`Load unpacked`** in the top-left and select the **`chrome-extension`** directory.
5. Pin the **TruthShield AI** extension 📌 in your browser toolbar.

### 2. Usage
1. Make sure the Next.js server is running.
2. Open the extension popup, click the **Settings Gear**, and enter your Next.js server URL (e.g., `http://localhost:3000` or your live Vercel URL).
3. Browse any page, open the extension, and click **Scan Current Page** to run real-time credibility analysis.

---

## 🛠️ Build & Installation

### Prerequisites
* **Node.js** v18+
* **Python** v3.8+ (Only for retraining)

### 1. Installation
```bash
# Clone and enter directory
cd fake-news-detector

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GOOGLE_FACT_CHECK_API_KEY=your_google_fact_check_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

### 4. Run Production Build
```bash
npm run build
```

---

## 🚀 Deployment (Vercel)

Since the core ML engine is lightweight and runs entirely client-side, the app is fully serverless and can be deployed to Vercel for free:

1. Push the code to a Git repository (GitHub/GitLab).
2. Connect the repository to **Vercel**.
3. Add `GOOGLE_FACT_CHECK_API_KEY` to Vercel Environment Variables.
4. Deploy!
5. In your Chrome Extension settings, change the target server URL to your live Vercel domain (`https://your-app.vercel.app`) to scan webpages globally.
