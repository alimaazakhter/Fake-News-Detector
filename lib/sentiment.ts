export interface SentimentStanceResult {
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number; // -100 to 100
  fear: number; // 0 to 100
  anger: number; // 0 to 100
  bias: number; // 0 to 100
  trustworthiness: number; // 0 to 100
}

// Lexicons specifically curated for news emotional & stance profiling
const POSITIVE_WORDS = new Set([
  "great", "good", "love", "progress", "success", "win", "excellent", "positive",
  "beautiful", "safe", "hope", "support", "achieve", "trust", "proud", "glad",
  "happy", "benefit", "improve", "solution", "healthy", "robust", "growth",
  "stable", "peace", "fair", "honest", "resolve", "advancement", "creative",
  "liberate", "liberation", "reconstruction", "humanitarian", "aid", "diplomacy"
]);

const NEGATIVE_WORDS = new Set([
  "bad", "worst", "fail", "lose", "horrible", "negative", "ugly", "damage",
  "error", "lie", "cheat", "fake", "wrong", "sad", "suffer", "pain", "sick",
  "toxic", "collapse", "disaster", "decline", "corrupt", "harm", "refuse",
  "scandal", "suspicious", "illegal", "guilty", "blame", "fault", "warn",
  "crisis", "hostility", "casualty", "casualties", "deadly", "fatal", "tragedy"
]);

const FEAR_WORDS = new Set([
  "panic", "threat", "terror", "fear", "emergency", "crisis", "alert", "dangerous",
  "warning", "alarm", "horror", "scary", "catastrophe", "risk", "dread", "concern",
  "worst", "survival", "deadly", "fatal", "shield", "secure", "scared", "spook",
  "epidemic", "pandemic", "vulnerable", "anxiety", "warning", "destabilize", "extinction",
  "war", "military", "bombing", "missile", "missiles", "nuclear", "weapon", "weapons",
  "conflict", "violence", "threaten", "threatening", "hostage", "kidnap", "danger"
]);

const ANGER_WORDS = new Set([
  "furious", "outrage", "slam", "anger", "attack", "hate", "dispute", "abuse",
  "accuse", "blast", "aggressive", "destroy", "enemy", "hostile", "offensive",
  "provoke", "victim", "revenge", "violent", "fury", "mad", "insult", "condemn",
  "slammed", "blasted", "mock", "ridicule", "betray", "cheat", "scold", "threaten",
  "clash", "clashes", "strike", "strikes", "assault", "retaliation", "retaliate",
  "fight", "combat", "killing", "murder", "execution"
]);

const BIAS_WORDS = new Set([
  "obviously", "absolutely", "proven", "fact", "never", "always", "completely",
  "definitely", "undoubtedly", "truth", "undeniable", "clearly", "indeed",
  "perfectly", "total", "extreme", "purely", "only", "must", "certainly",
  "biased", "agenda", "conspiracy", "propaganda", "truthful", "unquestionably",
  "official", "narrative", "censorship", "censored", "state-run", "claims", "claim"
]);

export function analyzeSentimentAndStance(text: string): SentimentStanceResult {
  if (!text) {
    return {
      sentiment: "neutral",
      sentimentScore: 0,
      fear: 0,
      anger: 0,
      bias: 0,
      trustworthiness: 100
    };
  }

  // Tokenize text into words
  const words = text
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 0);

  const wordCount = words.length || 1;

  let posCount = 0;
  let negCount = 0;
  let fearCount = 0;
  let angerCount = 0;
  let biasCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) posCount++;
    if (NEGATIVE_WORDS.has(word)) negCount++;
    if (FEAR_WORDS.has(word)) fearCount++;
    if (ANGER_WORDS.has(word)) angerCount++;
    if (BIAS_WORDS.has(word)) biasCount++;
  }

  // Calculate scores
  // Sentiment Valence (-100 to 100)
  const totalSentimentWords = posCount + negCount;
  let sentimentScore = 0;
  if (totalSentimentWords > 0) {
    sentimentScore = Math.round(((posCount - negCount) / totalSentimentWords) * 100);
  }

  // Determine sentiment category
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (sentimentScore > 15) sentiment = "positive";
  else if (sentimentScore < -15) sentiment = "negative";

  // Emotional stances (0 to 100)
  // We scale these scores so they represent a high density of emotional triggers.
  // For a 200-word article, 4-5 alarm words should yield a high score (~50%+).
  const denominator = Math.max(8, Math.sqrt(wordCount)); // dynamic baseline based on length
  
  const fearScore = Math.min(100, Math.round((fearCount / denominator) * 120));
  const angerScore = Math.min(100, Math.round((angerCount / denominator) * 120));
  const biasScore = Math.min(100, Math.round((biasCount / denominator) * 120));

  // Compute a credibility-alignment heuristic based on emotional stance
  // More emotional outage, alarmism, and absolute/biased bias words reduce the direct stylistic trustworthiness.
  const penalty = (fearScore * 0.25) + (angerScore * 0.4) + (biasScore * 0.35);
  const trustworthiness = Math.max(0, Math.round(100 - penalty));

  return {
    sentiment,
    sentimentScore,
    fear: fearScore,
    anger: angerScore,
    bias: biasScore,
    trustworthiness
  };
}
