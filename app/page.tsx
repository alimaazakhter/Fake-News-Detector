"use client";

import React, { useState, useEffect, useRef } from "react";
import { predictNews, ModelMetadata, PredictionResult } from "../lib/predictor";
import Tesseract from "tesseract.js";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Info, 
  FileText, Link2, Image as ImageIcon, Search, CheckCircle, 
  AlertCircle, RefreshCw, Clock, AlignLeft, HelpCircle, 
  Sliders, BarChart3, Database, ArrowRight, ExternalLink
} from "lucide-react";

// Sample Articles for Testing
const SAMPLE_ARTICLES = {
  real: `WASHINGTON (Reuters) - The U.S. Congress will vote on a major bipartisan infrastructure bill next week, according to house leaders. The proposal allocates over $1 trillion to improve highways, bridges, public transit systems, and expand high-speed internet access across rural communities. Proponents of the bill argue it will create thousands of jobs and boost long-term economic growth, while critics express concern over the funding mechanisms and federal debt impacts. Negotiations have been underway for several months between Republican and Democratic leaders to reach a compromise.`,
  fake: `BREAKING NEWS!!! You won't believe what scientists just uncovered in a secret underground lab in Antarctica! They found an ancient alien city that has been hidden under the ice for over 10,000 years! Government agencies are trying to cover this up and hide the truth from the public, but our sources have exposed the secret files! Share this shocking video immediately before it gets taken down by the shadow government. The truth cannot be silenced any longer!!!`
};

interface FactCheckClaim {
  text: string;
  claimant: string;
  claimDate: string;
  publisherName: string;
  publisherSite: string;
  rating: string;
  reviewUrl: string;
}

type InputTab = "text" | "url" | "ocr";

// Custom Hook for Dynamic Number Count-Up Animations
function useCountUp(target: number, trigger: any) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) {
      setCount(0);
      return;
    }
    let start = 0;
    const end = target;
    if (start === end) {
      setCount(end);
      return;
    }
    const totalDuration = 800;
    const incrementTime = Math.abs(Math.floor(totalDuration / end));
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, Math.max(incrementTime, 8));
    
    return () => clearInterval(timer);
  }, [target, trigger]);
  
  return count;
}

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const;

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 90, damping: 14 }
  }
} as const;

export default function Home() {
  const [model, setModel] = useState<ModelMetadata | null>(null);
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  
  // Inputs
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [claimQuery, setClaimQuery] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [isFactChecking, setIsFactChecking] = useState(false);
  
  // Results
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [factCheckClaims, setFactCheckClaims] = useState<FactCheckClaim[]>([]);
  const [factCheckError, setFactCheckError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic values count up
  const animatedConfidence = useCountUp(result ? result.confidence : 0, result);
  const animatedWordCount = useCountUp(result ? result.wordCount : 0, result);
  const animatedReadTime = useCountUp(result ? result.readTimeMin : 0, result);
  const animatedClickbait = useCountUp(result ? result.stats.clickbaitScore : 0, result);
  const animatedSensationalism = useCountUp(result ? result.stats.sensationalismScore : 0, result);

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
        setError("Could not load the trained model parameters. Ensure the model has been exported.");
      });
  }, []);

  const handleVerify = async (e?: React.FormEvent, textToVerify = inputText) => {
    if (e) e.preventDefault();
    if (!model || !textToVerify.trim()) return;

    setIsLoading(true);
    setFactCheckClaims([]);
    setFactCheckError(null);
    setIsFactChecking(true);

    // Clean up query text for Fact-Checking
    let factCheckQuery = "";
    const lines = textToVerify.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines[0].length < 200) {
      factCheckQuery = lines[0];
    } else {
      const sentences = textToVerify.split(/[.!?]+/);
      if (sentences.length > 0 && sentences[0].trim().length < 200) {
        factCheckQuery = sentences[0].trim();
      } else {
        factCheckQuery = textToVerify.slice(0, 150);
      }
    }
    setClaimQuery(factCheckQuery);

    setTimeout(async () => {
      try {
        const prediction = predictNews(textToVerify, model);
        setResult(prediction);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("An error occurred during verification.");
      } finally {
        setIsLoading(false);
      }

      // Google Fact-Check API call
      try {
        const res = await fetch("/api/fact-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: factCheckQuery }),
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.error === "API_KEY_NOT_CONFIGURED") {
            setFactCheckError("API_KEY_NOT_CONFIGURED");
          } else {
            setFactCheckClaims(data.claims || []);
          }
        } else {
          setFactCheckError("Could not retrieve claim verification data.");
        }
      } catch (err) {
        console.error("Fact check fetch error:", err);
        setFactCheckError("Could not connect to claim verification database.");
      } finally {
        setIsFactChecking(false);
      }
    }, 550);
  };

  const handleCheckCustomClaim = async (queryToSearch: string) => {
    if (!queryToSearch.trim()) return;
    setIsFactChecking(true);
    setFactCheckClaims([]);
    setFactCheckError(null);

    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToSearch }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.error === "API_KEY_NOT_CONFIGURED") {
          setFactCheckError("API_KEY_NOT_CONFIGURED");
        } else {
          setFactCheckClaims(data.claims || []);
        }
      } else {
        setFactCheckError("Could not retrieve claim verification data.");
      }
    } catch (err) {
      console.error("Fact check fetch error:", err);
      setFactCheckError("Could not connect to claim verification database.");
    } finally {
      setIsFactChecking(false);
    }
  };

  // URL Scraper Trigger
  const handleScrapeAndVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsScraping(true);
    setError(null);
    setResult(null);
    setFactCheckClaims([]);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: inputUrl }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to parse URL content.");
        return;
      }

      const data = await res.json();
      setInputText(data.text);
      
      // Auto-verify the extracted text
      handleVerify(undefined, data.text);
    } catch (err: any) {
      console.error(err);
      setError("An error occurred while scraping the link.");
    } finally {
      setIsScraping(false);
    }
  };

  // Image Upload and OCR Trigger
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processOcrFile(file);
    }
  };

  const processOcrFile = async (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setFactCheckClaims([]);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsOcrLoading(true);
    setOcrProgress(0);

    try {
      const result = await Tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extractedText = result.data.text.trim();
      if (!extractedText) {
        throw new Error("No readable text found in the image.");
      }

      setInputText(extractedText);
      // Auto-verify extracted text
      handleVerify(undefined, extractedText);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "OCR text extraction failed.");
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processOcrFile(file);
    }
  };

  const loadTemplate = (type: "real" | "fake") => {
    setActiveTab("text");
    setInputText(SAMPLE_ARTICLES[type]);
    setResult(null);
    setFactCheckClaims([]);
    setError(null);
  };

  // SVG Gauge calculations
  const strokeDashoffset = result 
    ? 440 - (440 * animatedConfidence) / 100 
    : 440;

  // Render Verdict Details
  const getVerdictIcon = () => {
    if (!result) return <HelpCircle className="w-5 h-5 text-slate-500" />;
    switch (result.verdict.state) {
      case "TRUSTED":
        return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case "LIKELY REAL":
        return <Shield className="w-5 h-5 text-teal-400" />;
      case "SUSPICIOUS":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "POSSIBLY MANIPULATED":
        return <Info className="w-5 h-5 text-orange-400" />;
      case "HIGH RISK":
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#030305] text-slate-100 cyber-grid overflow-hidden font-sans">
      {/* Moving Background Ambient Glows */}
      <div className="absolute top-[8%] left-[10%] w-[380px] h-[380px] rounded-full bg-emerald-500/5 cyber-orb" />
      <div className="absolute bottom-[10%] right-[10%] w-[380px] h-[380px] rounded-full bg-teal-500/5 cyber-orb" />

      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 relative z-10">
        
        {/* Header Branding */}
        <header className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center glow-emerald">
              <Shield className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-wider bg-gradient-to-r from-emerald-400 to-teal-400 -webkit-background-clip-text text-transparent uppercase">
                TruthShield AI
              </span>
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold">Misinfo Firewall v1.2</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold font-mono tracking-wider">SECURE INFERENCE CORE</span>
          </div>
        </header>

        {/* Hero Branding Section */}
        <div className="text-center py-8 mb-6 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-3 font-mono">
            <span className="bg-gradient-to-r from-amber-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              TruthShield AI
            </span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed font-medium px-4">
            Analyze headlines, URLs, or screenshots. Our debiased local classifier works alongside live fact-checking resources to shield you from misinformation.
          </p>
        </div>

        {/* Cinematic Dashboard Layout */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start"
        >
          
          {/* ==================== LEFT COLUMN ==================== */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-start">
            
            {/* Input Selection Card */}
            <motion.div 
              variants={cardVariants}
              className="glass-card p-6 rounded-3xl h-[420px] flex flex-col justify-between"
            >
              {/* Tab Selector */}
              <div className="p-1 bg-slate-950/60 border border-slate-900 rounded-2xl flex items-center justify-between gap-1 mb-4">
                <button
                  onClick={() => { setActiveTab("text"); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "text"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Manual Text
                </button>
                <button
                  onClick={() => { setActiveTab("url"); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "url"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Article URL
                </button>
                <button
                  onClick={() => { setActiveTab("ocr"); setError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === "ocr"
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/20"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Image OCR
                </button>
              </div>

              {/* Tab Panels */}
              <div className="flex-1 flex flex-col justify-center">
                
                {/* Manual Text Tab */}
                {activeTab === "text" && (
                  <form onSubmit={handleVerify} className="space-y-4 flex-1 flex flex-col justify-between">
                    <div className="relative flex-1 min-h-[170px]">
                      <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Paste article headline or full body text here..."
                        className="absolute inset-0 w-full bg-slate-950/40 border border-slate-900 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 rounded-2xl p-4 text-slate-200 placeholder-slate-600 transition outline-none resize-none text-xs md:text-sm shadow-inner"
                        required
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">Templates:</span>
                        <button
                          type="button"
                          onClick={() => loadTemplate("real")}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold transition cursor-pointer"
                        >
                          ✓ Congress Bill
                        </button>
                        <button
                          type="button"
                          onClick={() => loadTemplate("fake")}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/5 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[10px] font-bold transition cursor-pointer"
                        >
                          ✗ Antarctic City
                        </button>
                      </div>
                      
                      <div className="text-[10px] text-slate-500 font-mono">
                        {inputText.split(/\s+/).filter(Boolean).length} words
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setInputText("");
                          setResult(null);
                          setFactCheckClaims([]);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/40 text-slate-400 hover:text-slate-200 text-xs font-bold transition cursor-pointer"
                      >
                        Clear
                      </button>
                      
                      <button
                        type="submit"
                        disabled={!model || isLoading || !inputText.trim()}
                        className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="animate-spin w-3.5 h-3.5" />
                            Evaluating Style...
                          </>
                        ) : "Scan News Content"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Article URL Scraper Tab */}
                {activeTab === "url" && (
                  <form onSubmit={handleScrapeAndVerify} className="space-y-4 py-3 flex-1 flex flex-col justify-between min-h-[220px]">
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-emerald"></span>
                        Crawl Article Link
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Input the URL of a blog post or news site. We will fetch and extract the core article contents and run analysis.
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder="https://example.com/news-article-slug"
                        className="w-full bg-slate-950/40 border border-slate-900 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/10 rounded-2xl p-4 text-slate-200 placeholder-slate-600 transition outline-none text-xs md:text-sm shadow-inner"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isScraping || !inputUrl.trim()}
                        className="w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                        {isScraping ? (
                          <>
                            <RefreshCw className="animate-spin w-3.5 h-3.5" />
                            Crawling & Analyzing...
                          </>
                        ) : "Scrape & Analyze URL"}
                      </button>
                    </div>
                  </form>
                )}

                {/* Screenshot OCR Tab */}
                {activeTab === "ocr" && (
                  <div className="space-y-4 py-2 flex-1 flex flex-col justify-between min-h-[220px]">
                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-emerald"></span>
                        Analyze Social Screenshots (OCR)
                      </h3>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Drag and drop screenshots of WhatsApp forwards, posts, or images.
                      </p>
                    </div>

                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-900 hover:border-emerald-500/40 bg-slate-950/10 hover:bg-slate-950/30 rounded-2xl p-5 text-center cursor-pointer transition duration-300 flex flex-col items-center justify-center min-h-[120px] relative group overflow-hidden"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />

                      {imagePreview ? (
                        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 blur-[1px]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imagePreview} alt="Preview" className="object-cover w-full h-full" />
                        </div>
                      ) : null}

                      <div className="relative z-10 space-y-2">
                        <div className="w-9 h-9 mx-auto rounded-full bg-slate-900/80 flex items-center justify-center border border-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/20 transition">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-300">
                            {selectedFile ? selectedFile.name : "Drag & drop image here or click to browse"}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5 font-mono">PNG, JPG, JPEG, and WebP</p>
                        </div>
                      </div>
                    </div>

                    {isOcrLoading ? (
                      <div className="space-y-1.5 p-3 bg-slate-950/60 border border-slate-900 rounded-xl">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-slate-400">OCR Parsing Image Text...</span>
                          <span className="text-emerald-400 font-bold">{ocrProgress}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-200"
                            style={{ width: `${ocrProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

              </div>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[11px] leading-relaxed">
                  {error}
                </div>
              )}
            </motion.div>

            {/* Extracted Context Content Card */}
            <motion.div 
              variants={cardVariants}
              className="glass-card p-6 rounded-3xl h-[230px] flex flex-col justify-between fade-mask"
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Extracted Context Content</span>
                {inputText && (
                  <span className="text-[9px] font-mono text-slate-500">{inputText.length} chars</span>
                )}
              </h3>
              
              <div className="flex-1 bg-slate-950/40 border border-slate-900 rounded-2xl p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-500/20 scrollbar-track-transparent">
                {inputText ? (
                  <p className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {inputText}
                  </p>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <p className="text-[11px] font-mono text-slate-600 max-w-xs leading-normal">
                      Awaiting source news context... Paste text, crawl a link, or upload an image to see details.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Linguistic Heuristics Card */}
            <motion.div 
              variants={cardVariants}
              className="glass-card p-6 rounded-3xl h-[270px] flex flex-col justify-between"
            >
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Linguistic Heuristics
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Word Count</div>
                    <div className="text-xl font-bold text-slate-200 mt-1 font-mono">
                      {result ? animatedWordCount : "--"}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Reading Time</div>
                    <div className="text-xl font-bold text-slate-200 mt-1 font-mono">
                      {result ? `${animatedReadTime} min` : "--"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Clickbait Score</span>
                    <span className="font-semibold text-slate-300 font-mono">{result ? `${animatedClickbait}%` : "0%"}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: result ? `${animatedClickbait}%` : "0%" }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sensationalism Index</span>
                    <span className="font-semibold text-slate-300 font-mono">{result ? `${animatedSensationalism}%` : "0%"}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-amber-500"
                      initial={{ width: 0 }}
                      animate={{ width: result ? `${animatedSensationalism}%` : "0%" }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

          </div>

          {/* ==================== RIGHT COLUMN ==================== */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-start">
            
            {/* ROW 1: Gauge (Left) & Sentiment Profile (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Credibility Indicator Gauge with dynamic Verdict Badging */}
              <motion.div 
                variants={cardVariants}
                className="glass-card p-6 rounded-3xl min-h-[340px] flex flex-col justify-between items-center text-center pb-5"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider self-start flex items-center justify-between w-full">
                  <span>Credibility Indicator</span>
                  {result && (
                    <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md border font-mono tracking-wider flex items-center gap-1 ${result.verdict.badgeClass}`}>
                      {getVerdictIcon()}
                      {result.verdict.state}
                    </span>
                  )}
                </h3>
                
                <div className="relative w-36 h-36 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className="stroke-slate-950/60"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      className={`transition-all duration-700 ${
                        result ? (result.isReal ? "stroke-emerald-400" : "stroke-rose-500") : "stroke-slate-800/40"
                      }`}
                      strokeWidth="9"
                      fill="transparent"
                      strokeDasharray="440"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Gauge Text */}
                  <div className="absolute text-center">
                    <div className={`text-3xl font-extrabold tracking-tight font-mono ${
                      result ? (result.isReal ? "text-emerald-400" : "text-rose-400") : "text-slate-600"
                    }`}>
                      {result ? `${animatedConfidence}%` : "--%"}
                    </div>
                    <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">
                      {result ? (result.isReal ? "REAL STYLE" : "FAKE STYLE") : "AWAITING DATA"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 w-full">
                  {result?.anomalyWarning && (
                    <div className="mx-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[10px] md:text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.05)] animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-bounce" style={{ animationDuration: '2s' }} />
                      <span>{result.anomalyWarning}</span>
                    </div>
                  )}
                  <h4 className="text-xs text-slate-300 leading-relaxed px-2 line-clamp-3">
                    {result ? result.verdict.description : "Awaiting news content source to verify credibility signature."}
                  </h4>
                </div>
              </motion.div>

              {/* Psychological & Sentiment Profile with Tooltips */}
              <motion.div 
                variants={cardVariants}
                className="glass-card p-6 rounded-3xl h-[340px] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sentiment Stance
                  </h3>
                  <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border font-mono ${
                    result 
                      ? (result.sentiment.sentiment === "positive" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : result.sentiment.sentiment === "negative"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-slate-900 text-slate-400 border-slate-900")
                      : "bg-slate-950/60 text-slate-600 border-slate-900"
                  }`}>
                    {result ? result.sentiment.sentiment.toUpperCase() : "AWAITING"}
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Trustworthiness Indicator */}
                  <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Tone Integrity</div>
                    <div className={`text-base font-bold font-mono ${
                      result 
                        ? (result.sentiment.trustworthiness >= 70 ? "text-emerald-400" : result.sentiment.trustworthiness >= 40 ? "text-amber-400" : "text-rose-400")
                        : "text-slate-600"
                    }`}>
                      {result ? `${result.sentiment.trustworthiness}%` : "--%"}
                    </div>
                  </div>

                  {/* Stance Sliders with Custom Tooltips */}
                  <div className="space-y-2 tooltip-container">
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        Alarmism / Fear
                        <HelpCircle className="w-3 h-3 text-slate-600" />
                      </span>
                      <span className="font-semibold text-slate-400 font-mono">{result ? `${result.sentiment.fear}%` : "0%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: result ? `${result.sentiment.fear}%` : "0%" }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="tooltip-text">Tracks words linked to panic, danger, or fear. High alarmism often indicates sensationalised content.</span>
                  </div>

                  <div className="space-y-2 tooltip-container">
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        Hostility / Anger
                        <HelpCircle className="w-3 h-3 text-slate-600" />
                      </span>
                      <span className="font-semibold text-slate-400 font-mono">{result ? `${result.sentiment.anger}%` : "0%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-rose-500"
                        initial={{ width: 0 }}
                        animate={{ width: result ? `${result.sentiment.anger}%` : "0%" }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="tooltip-text">Measures angry or outrage-triggering verbs and adjectives that drive clickbait.</span>
                  </div>

                  <div className="space-y-2 tooltip-container">
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-slate-500 flex items-center gap-1">
                        Certainty / Bias
                        <HelpCircle className="w-3 h-3 text-slate-600" />
                      </span>
                      <span className="font-semibold text-slate-400 font-mono">{result ? `${result.sentiment.bias}%` : "0%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: result ? `${result.sentiment.bias}%` : "0%" }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="tooltip-text">Highlights dogmatism or bias (e.g. absolute words like 'always', 'fact', or state-media markers).</span>
                  </div>
                </div>
              </motion.div>

            </div>

            {/* ROW 2: Top Word Indicators Card */}
            <motion.div 
              variants={cardVariants}
              className="glass-card p-6 rounded-3xl min-h-[300px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Top Word Indicators (Model Weights)
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                    Linguistic features that most heavily influenced the classifier result.
                  </p>
                </div>
                <div className="tooltip-container">
                  <HelpCircle className="w-4 h-4 text-slate-600 cursor-help" />
                  <span className="tooltip-text">Model coefficients parsed on the TF-IDF vocabulary. Emerald weights indicate REAL signals, Rose indicate FAKE.</span>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center mt-3">
                {result && result.stats.topContributingWords.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {result.stats.topContributingWords.map((wordObj, i) => {
                      const isPositiveReal = wordObj.impact > 0;
                      const impactPercentage = Math.min(100, Math.round(Math.abs(wordObj.impact) * 200));

                      return (
                        <div key={i} className="flex items-center text-xs justify-between gap-4">
                          <span className="w-16 font-mono text-slate-300 truncate">{wordObj.word}</span>
                          <div className="flex-1 h-3.5 flex items-center bg-slate-950/40 border border-slate-900 rounded-md overflow-hidden relative">
                            <motion.div
                              className={`h-full rounded-sm ${
                                isPositiveReal ? "bg-emerald-500/80 ml-auto mr-[50%]" : "bg-rose-500/80 ml-[50%] mr-auto"
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${impactPercentage / 2}%` }}
                              transition={{ duration: 0.6 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed border-slate-900 rounded-2xl">
                    <p className="text-xs text-slate-600 font-mono">
                      No vocabulary weights parsed. Complete a verify scan to generate indicators.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* ROW 3: Live Claim Verification Card (Google Fact Check) */}
            <motion.div 
              variants={cardVariants}
              className="glass-card p-6 rounded-3xl min-h-[280px] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                  Live Claim Verification
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Google Fact Check API</span>
              </div>

              {/* Interactive Claim Query Input */}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={claimQuery}
                  onChange={(e) => setClaimQuery(e.target.value)}
                  placeholder="Enter claim topic or keyword to search..."
                  className="flex-1 bg-slate-950/50 border border-slate-900 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/10 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none placeholder-slate-600 transition"
                />
                <button
                  onClick={() => handleCheckCustomClaim(claimQuery)}
                  disabled={isFactChecking || !claimQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search
                </button>
              </div>

              <div className="flex-1 flex flex-col justify-center mt-3">
                {isFactChecking ? (
                  <div className="space-y-2 py-4 text-center">
                    <RefreshCw className="animate-spin h-5 w-5 text-emerald-400 mx-auto" />
                    <p className="text-xs text-slate-500">Cross-referencing database reports...</p>
                  </div>
                ) : factCheckError === "API_KEY_NOT_CONFIGURED" ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[11px] text-amber-400 leading-relaxed flex gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Fact Check API Key Not Configured</p>
                      Add <code className="bg-amber-950/40 px-1 py-0.5 rounded font-mono text-[10px]">GOOGLE_FACT_CHECK_API_KEY</code> to your <code className="bg-amber-950/40 px-1 py-0.5 rounded font-mono text-[10px]">.env.local</code> to enable liveSnopes and PolitiFact checks.
                    </div>
                  </div>
                ) : factCheckClaims.length > 0 ? (
                  <div className="space-y-3.5 max-h-[160px] overflow-y-auto pr-1">
                    {factCheckClaims.map((claim, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/40 border border-slate-900 rounded-2xl space-y-2 text-[11px]">
                        <div className="text-slate-300 leading-normal italic">
                          &ldquo;{claim.text}&rdquo;
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[10px] text-slate-500">
                          <div>
                            Claimant: <span className="text-slate-400 font-medium">{claim.claimant}</span>
                          </div>
                          <div>
                            Source: <span className="text-slate-400 font-medium">{claim.publisherName}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                            claim.rating.toLowerCase().includes("true") 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : claim.rating.toLowerCase().includes("false") || claim.rating.toLowerCase().includes("incorrect")
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            Verdict: {claim.rating}
                          </span>
                          {claim.reviewUrl && (
                            <a
                              href={claim.reviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-0.5"
                            >
                              Read Review
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed border-slate-900 rounded-2xl flex flex-col items-center gap-1.5">
                    <Info className="w-4 h-4 text-slate-600" />
                    <p className="text-[11px] text-slate-600 font-mono">
                      No verified fact-check reports found. Try simplifying query terms.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </motion.div>

        {/* Footer Statistics */}
        {model && (
          <footer className="mt-12 border-t border-slate-900 pt-6 text-center text-xs text-slate-600 space-y-1.5 bg-transparent">
            <div>
              Classifier: <span className="font-semibold text-slate-500 font-mono">Client-Side TF-IDF + Logistic Regression</span>
            </div>
            <div className="flex justify-center items-center gap-4">
              <span>Model Accuracy: <span className="font-semibold text-emerald-400">{(model.accuracy * 100).toFixed(2)}%</span></span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
              <span>Vocabulary Size: <span className="font-semibold text-slate-500 font-mono">{model.feature_names.length} terms</span></span>
            </div>
          </footer>
        )}
        
      </div>
    </div>
  );
}
