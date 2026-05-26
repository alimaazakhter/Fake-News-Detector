export interface ModelMetadata {
  feature_names: string[];
  vocab_indices: { [word: string]: number };
  idf: number[];
  coefficients: number[];
  intercept: number;
  accuracy: number;
}

export function cleanText(text: string): string {
  if (!text) return "";
  let cleaned = text.toLowerCase();
  // Remove brackets and contents
  cleaned = cleaned.replace(/\[.*?\]/g, "");
  // Remove URLs
  cleaned = cleaned.replace(/https?:\/\/\S+|www\.\S+/g, "");
  // Remove HTML tags
  cleaned = cleaned.replace(/<.*?>+/g, "");
  // Remove punctuation and special characters (keep only a-z and spaces)
  cleaned = cleaned.replace(/[^a-zA-Z\s]/g, "");
  // Normalize spacing
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

export interface PredictionResult {
  isReal: boolean;
  confidence: number; // probability of predicted class (0 to 100)
  realProbability: number; // probability of being REAL (0 to 1)
  wordCount: number;
  readTimeMin: number;
  stats: {
    clickbaitScore: number; // 0 to 100
    sensationalismScore: number; // 0 to 100
    topContributingWords: Array<{ word: string; weight: number; impact: number }>;
  };
}

export function predictNews(text: string, model: ModelMetadata): PredictionResult {
  const cleaned = cleanText(text);
  const words = cleaned.split(" ").filter(w => w.length > 0);
  const wordCount = words.length;
  const readTimeMin = Math.ceil(wordCount / 225); // average reading speed: 225 wpm

  // 1. Calculate TF (Term Counts)
  const termCounts: { [idx: number]: number } = {};
  for (const word of words) {
    if (word in model.vocab_indices) {
      const idx = model.vocab_indices[word];
      termCounts[idx] = (termCounts[idx] || 0) + 1;
    }
  }

  // 2. Compute un-normalized TF-IDF
  let sumSq = 0;
  const tfidf: { [idx: number]: number } = {};
  for (const idxStr in termCounts) {
    const idx = parseInt(idxStr);
    const val = termCounts[idx] * model.idf[idx];
    tfidf[idx] = val;
    sumSq += val * val;
  }

  // 3. Apply L2 Normalization
  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (const idxStr in tfidf) {
      const idx = parseInt(idxStr);
      tfidf[idx] /= norm;
    }
  }

  // 4. Compute decision value: sum(coeff * value) + intercept
  let decisionValue = model.intercept;
  const contributingWords: Array<{ word: string; weight: number; impact: number }> = [];

  for (const idxStr in tfidf) {
    const idx = parseInt(idxStr);
    const weight = model.coefficients[idx];
    const value = tfidf[idx];
    const impact = weight * value;
    decisionValue += impact;

    contributingWords.push({
      word: model.feature_names[idx],
      weight: weight,
      impact: impact
    });
  }

  // 5. Apply Sigmoid to get probability of class 1 (REAL)
  const realProbability = 1 / (1 + Math.exp(-decisionValue));
  const isReal = realProbability >= 0.5;
  const confidence = isReal ? realProbability * 100 : (1 - realProbability) * 100;

  // 6. Sort contributing words by absolute impact to show top indicators
  const sortedContributors = contributingWords
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 8);

  // 7. Clickbait and sensationalism checks (heuristic-based metrics for dashboard)
  let clickbaitScore = 0;
  const clickbaitRegexes = [
    /\b(you won't believe|shocking|secret|unbelievable|mind-blowing|revealed|exposed|viral|must watch)\b/gi,
    /\b(digits|percent|percentage)\b/gi,
    /^[A-Z\s]{5,}/, // uppercase starter
    /!{2,}/ // multiple exclamation marks
  ];
  for (const regex of clickbaitRegexes) {
    if (regex.test(text)) clickbaitScore += 25;
  }

  let sensationalismScore = 0;
  const sensationalWords = /\b(devastating|catastrophe|miracle|chaos|panic|furious|slam|destroy|blast|outrage|horrifying|brutal)\b/gi;
  const sensationalMatches = text.match(sensationalWords);
  if (sensationalMatches) {
    sensationalismScore = Math.min(100, sensationalMatches.length * 15 + 10);
  }

  return {
    isReal,
    confidence: Math.round(confidence),
    realProbability,
    wordCount,
    readTimeMin,
    stats: {
      clickbaitScore,
      sensationalismScore,
      topContributingWords: sortedContributors
    }
  };
}
