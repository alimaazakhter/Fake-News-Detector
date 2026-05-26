"use client";

import React, { useState, useEffect } from "react";
import { predictNews, ModelMetadata, PredictionResult } from "../lib/predictor";

// Sample Articles for Testing
const SAMPLE_ARTICLES = {
  real: `WASHINGTON (Reuters) - The U.S. Congress will vote on a major bipartisan infrastructure bill next week, according to house leaders. The proposal allocates over $1 trillion to improve highways, bridges, public transit systems, and expand high-speed internet access across rural communities. Proponents of the bill argue it will create thousands of jobs and boost long-term economic growth, while critics express concern over the funding mechanisms and federal debt impacts. Negotiations have been underway for several months between Republican and Democratic leaders to reach a compromise.`,
  fake: `BREAKING NEWS!!! You won't believe what scientists just uncovered in a secret underground lab in Antarctica! They found an ancient alien city that has been hidden under the ice for over 10,000 years! Government agencies are trying to cover this up and hide the truth from the public, but our sources have exposed the secret files! Share this shocking video immediately before it gets taken down by the shadow government. The truth cannot be silenced any longer!!!`
};

export default function Home() {
  const [model, setModel] = useState<ModelMetadata | null>(null);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load the model JSON on mount
  useEffect(() => {
    fetch("/model_metadata.json")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Model parameters file not found.");
        }
        return res.json();
      })
      .then((data) => {
        setModel(data);
      })
      .catch((err) => {
        console.error("Error loading model data:", err);
        setError("Could not load the trained model parameters.");
      });
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !inputText.trim()) return;

    setIsLoading(true);
    // Simulate minor processing delay for nice visual transition
    setTimeout(() => {
      try {
        const prediction = predictNews(inputText, model);
        setResult(prediction);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("An error occurred during verification.");
      } finally {
        setIsLoading(false);
      }
    }, 550);
  };

  const loadTemplate = (type: "real" | "fake") => {
    setInputText(SAMPLE_ARTICLES[type]);
    setResult(null);
  };

  // SVG Gauge calculations
  const strokeDashoffset = result 
    ? 440 - (440 * result.confidence) / 100 
    : 440;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Ambient Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 glow-emerald">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text-animated">TruthShield AI</span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 max-w-2xl mx-auto">
            Validate news integrity instantly. Our advanced client-side Machine Learning model evaluates style, writing patterns, and structural credentials in real-time.
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Panel */}
          <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-3xl animate-slide-up">
            <h2 className="text-lg md:text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 glow-emerald animate-pulse"></span>
              Analyze News Content
            </h2>
            
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste article headline or full text here..."
                  rows={10}
                  className="w-full bg-slate-950/50 border border-slate-800/80 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 rounded-2xl p-4 text-slate-200 placeholder-slate-600 transition duration-300 outline-none resize-none scrollbar-hide text-sm md:text-base shadow-inner"
                  required
                />
                <div className="absolute bottom-4 right-4 text-xs text-slate-500">
                  {inputText.split(/\s+/).filter(Boolean).length} words
                </div>
              </div>

              {/* Quick Templates */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Test Templates:</span>
                <button
                  type="button"
                  onClick={() => loadTemplate("real")}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold transition duration-300 cursor-pointer"
                >
                  ✓ Bipartisan Congress Bill
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("fake")}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-bold transition duration-300 cursor-pointer"
                >
                  ✗ Antarctic Alien City
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setInputText("");
                    setResult(null);
                  }}
                  className="px-5 py-3 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800/60 text-slate-400 hover:text-slate-200 text-sm font-semibold transition duration-300 cursor-pointer"
                >
                  Clear
                </button>
                
                <button
                  type="submit"
                  disabled={!model || isLoading || !inputText.trim()}
                  className="flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verifying text pattern...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Verify Style Signature
                    </>
                  )}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Right Column: Prediction Dashboard */}
          <div className="lg:col-span-5 space-y-6">
            {/* Main Result Card */}
            <div className="glass-card p-6 md:p-8 rounded-3xl min-h-[380px] flex flex-col justify-center items-center text-center relative overflow-hidden animate-slide-up">
              {!result ? (
                <div className="space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-900/40 flex items-center justify-center text-slate-500 border border-slate-800 border-dashed">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-300">Ready to Analyze</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">
                      Enter text on the left panel and click verify. Prediction logic runs client-side instantly.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full space-y-6 animate-fade-in">
                  {/* Result Ring Gauge */}
                  <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        className="stroke-slate-950/60"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        className={`transition-all duration-1000 ${
                          result.isReal ? "stroke-emerald-400" : "stroke-rose-500"
                        }`}
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray="440"
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Inner text */}
                    <div className="absolute text-center">
                      <div className={`text-3xl font-extrabold tracking-tight ${
                        result.isReal ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {result.confidence}%
                      </div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                        {result.isReal ? "REAL STYLE" : "FAKE STYLE"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className={`text-2xl font-bold tracking-tight ${
                      result.isReal ? "gradient-text" : "text-rose-400"
                    }`}>
                      {result.isReal ? "Credible Style Signature" : "Disinformation Style Signature"}
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-6">
                      Our model determined a high probability of this article being{" "}
                      <span className={result.isReal ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {result.isReal ? "REAL" : "FAKE"}
                      </span>{" "}
                      based on stylistic features, news vocabulary, and structural layout.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats Breakdown Card */}
            {result && (
              <div className="glass-card p-6 rounded-3xl space-y-5 animate-slide-up">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Heuristic Text Statistics
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl">
                      <div className="text-xs text-slate-500">Word Count</div>
                      <div className="text-lg font-bold text-slate-200 mt-1">{result.wordCount}</div>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl">
                      <div className="text-xs text-slate-500">Reading Time</div>
                      <div className="text-lg font-bold text-slate-200 mt-1">{result.readTimeMin} min</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Clickbait Score</span>
                      <span className="font-semibold text-slate-300">{result.stats.clickbaitScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-750"
                        style={{ width: `${result.stats.clickbaitScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Sensationalism / Outrage Index</span>
                      <span className="font-semibold text-slate-300">{result.stats.sensationalismScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 transition-all duration-750"
                        style={{ width: `${result.stats.sensationalismScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Explainability Dashboard Card (SHAP/LIME-like word indicators) */}
            {result && result.stats.topContributingWords.length > 0 && (
              <div className="glass-card p-6 rounded-3xl space-y-4 animate-slide-up">
                <div>
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                    Top Word Indicators (Model Weights)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Words that most heavily influenced the decision (Emerald = drives Real, Rose = drives Fake).
                  </p>
                </div>

                <div className="space-y-3">
                  {result.stats.topContributingWords.map((wordObj, i) => {
                    const isPositiveReal = wordObj.impact > 0;
                    const impactPercentage = Math.min(100, Math.round(Math.abs(wordObj.impact) * 200));

                    return (
                      <div key={i} className="flex items-center text-xs">
                        <span className="w-20 font-mono text-slate-300 truncate">{wordObj.word}</span>
                        <div className="flex-1 h-3 flex items-center bg-slate-950/40 rounded-md overflow-hidden relative">
                          <div
                            className={`h-full transition-all duration-750 rounded-sm ${
                              isPositiveReal ? "bg-emerald-500/80 ml-auto mr-[50%]" : "bg-rose-500/80 ml-[50%] mr-auto"
                            }`}
                            style={{ width: `${impactPercentage / 2}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Information Section */}
        {model && (
          <div className="mt-16 border-t border-slate-800/40 pt-8 text-center text-xs text-slate-500 space-y-2">
            <div>
              System: <span className="font-semibold text-slate-400">TF-IDF Vectorizer + Logistic Regression Classifier</span>
            </div>
            <div>
              Model Accuracy: <span className="font-semibold text-emerald-400">{(model.accuracy * 100).toFixed(2)}%</span> on balanced news dataset.
            </div>
            <div>
              Vocabulary Size: <span className="font-semibold text-slate-400">{model.feature_names.length} terms</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
