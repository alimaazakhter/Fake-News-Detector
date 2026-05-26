# TruthShield AI — Fake News Detector Dashboard

> **Project Title:** TruthShield AI (Stylistic News Attribution Model + Web UI Dashboard)  
> **Developed by:** Alimaaz Akhter  
> **Acknowledgement:** Originally conceived and developed during my Data Science & ML internship at **Technest**.

TruthShield AI is a complete, interactive, and visually stunning web application that detects the credibility of news articles. Rather than relying on simple database lookups, the system uses a **debiased machine learning model** running entirely **client-side** in the browser to analyze the writing signature, styling, sensationalism, and vocabulary of any news article in real-time.

Because the entire inference engine runs client-side (using a custom TF-IDF + Logistic Regression implementation in pure TypeScript), this application can be hosted **100% for free** on Vercel with **0ms cold starts** and zero backend dependencies—making it the perfect interactive piece to showcase on a portfolio.

---

## 🌟 Key Features

* **Client-Side ML Inference:** Real-time predictions in the browser with 0ms server latency and no backend costs.
* **Debiased Classifier:** Retrained on a balanced dataset of 30,000 articles, stripped of metadata shortcuts (like "Reuters" prefixes, location headers, and publication tags) to focus purely on stylistic and semantic differences (97.60% accuracy).
* **Explainability Panel (LIME/SHAP-style):** A visual breakdown that highlights the exact words in the text that influenced the model's decision, colored by positive (real) or negative (fake) weight contribution.
* **Heuristic Text Analytics:** Real-time calculations for:
  - **Word Count & Reading Time:** Estimated based on standard reading speeds.
  - **Clickbait Index:** Checks for outrageous claims, capital letters, and punctuation markers.
  - **Sensationalism Index:** Analyzes the density of outrage-trigger words (e.g. *slam*, *panicked*, *furious*, *shocking*).
* **Cyber-Charcoal UI Theme:** A state-of-the-art dark mode interface styled with an obsidian charcoal background (`#0b0c10`), ambient emerald-green and amber-orange glowing blur overlays, and fully responsive glassmorphism containers.

---

## 📂 Repository Structure

```
fake-news-detector/
├── ml/
│   ├── data/                 # Raw datasets (Fake.csv, True.csv)
│   └── train_model.py        # Python data downloader, debiaser & model trainer
├── public/
│   └── model_metadata.json   # Exported vocabulary, IDF weights & LR coefficients
├── lib/
│   └── predictor.ts          # Core client-side TF-IDF and Logistic Regression math
├── app/
│   ├── globals.css           # Tailwind v4 directives and glow-effect keyframes
│   ├── layout.tsx            # Global SEO headers and Space Grotesk/Inter typography
│   └── page.tsx              # Main dashboard frontend interface
├── package.json              # Next.js 16 + React 19 + Tailwind v4 configuration
├── tsconfig.json             # TypeScript compiler options
└── README.md                 # Project documentation
```

---

## 🔬 Machine Learning Pipeline & Debiasing

Traditional models trained on news datasets learn to look for publisher signatures (like the word `"Reuters"` or location headers like `"WASHINGTON (Reuters) -"`) rather than actual linguistic style. TruthShield AI corrects this through a **debiased NLP training pipeline** in `ml/train_model.py`:

1. **Header Stripping:** Automatically removes all location/agency patterns (e.g. `^[CITY] (Reuters) -`) from the beginning of the text during the cleaning phase.
2. **Attribution Stop-Words:** Injects common dataset shortcut words into the TF-IDF stop-words list so the model cannot use them as indicators:
   ```python
   custom_stop_words = [
       'reuters', 'said', 'tuesday', 'wednesday', 'thursday', 'friday', 
       'monday', 'sunday', 'saturday', 'washington', 'london', 'image', 
       'images', 'photo', 'via', 'featured', 'caption', 'read', 'photo'
   ]
   ```
3. **Training & Export:** Fits a `TfidfVectorizer` (limited to 5,000 features for optimal browser performance) and a `LogisticRegression` classifier, then exports the parameters directly to a JSON payload.

### Model Performance (Debiased)
```
Accuracy: 97.60%

Classification Report:
              precision    recall  f1-score   support

        FAKE       0.98      0.96      0.97      2474
        REAL       0.97      0.99      0.98      2973
```

---

## 🧮 How Client-Side Inference Works (TypeScript)

When the Next.js app mounts, it fetches `/model_metadata.json` containing the pre-trained weights. When text is submitted:
1. **Linguistic Pre-processing:** The text is cleaned of URLs, HTML tags, punctuation, and lowercased.
2. **TF-IDF Calculation:** Words are mapped to vocabulary indices. For each matching word, we calculate the term frequency and multiply by the exported Inverse Document Frequency (IDF) weight.
3. **L2 Normalization:** The un-normalized vector is normalized by dividing by its L2 norm ($||v||_2$) to handle varying document lengths.
4. **Logistic Regression Prediction:** We compute the dot product of the L2-normalized vector and the model coefficients, add the intercept, and feed the score to the Sigmoid activation function:
   $$\sigma(z) = \frac{1}{1 + e^{-z}}$$
   This yields the final probability (0% to 100%) of the news being REAL or FAKE.

---

## 🛠️ Setup & Installation

### Prerequisites
* Python 3.8+
* Node.js 18+

### 1. Train and Export the Model (Optional)
If you want to modify the training dataset or retrain the model, run the Python pipeline:
```bash
# Navigate to the ML directory
cd ml

# Run the training script (downloads dataset, cleans it, trains, and exports JSON)
python train_model.py
```

### 2. Setup the Next.js Web App
```bash
# Navigate to the root directory
cd ..

# Install dependencies (React 19, Next.js 16, Tailwind v4)
npm install

# Start the local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the dashboard!

---

## 🚀 Showcasing & Deployment

Since this application has **no Python runtime dependencies** or databases during execution, you can deploy it directly to the web for free using **Vercel**:

1. Push your project folder to your GitHub account.
2. Go to [Vercel.com](https://vercel.com) and sign in.
3. Click **Add New Project**, select the repository, and click **Deploy**.
4. Link this deployed URL directly inside your main portfolio project section!
