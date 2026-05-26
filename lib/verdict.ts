export type VerdictState = "TRUSTED" | "LIKELY REAL" | "SUSPICIOUS" | "POSSIBLY MANIPULATED" | "HIGH RISK";

export interface VerdictResult {
  state: VerdictState;
  badgeClass: string;
  description: string;
  bullets: string[];
}

export function computeVerdict(
  isReal: boolean,
  confidence: number,
  clickbaitScore: number,
  sensationalismScore: number,
  fearScore: number,
  angerScore: number,
  biasScore: number,
  isAnomaly?: boolean
): VerdictResult {
  // If common sense anomaly detected, override and trigger suspicious verdict
  if (isAnomaly) {
    return {
      state: "SUSPICIOUS",
      badgeClass: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      description: "Potential unrealistic or factually impossible claim detected. The claims involve absurd, exaggerated, or impossible scenarios.",
      bullets: [
        "Unrealistic or factually impossible concepts detected",
        "Heuristics flagged logical mismatch or supernatural elements",
        "Sensationalist statement structure identified",
        "High probability of online disinformation or satire"
      ]
    };
  }

  // Count warning flags based on thresholds
  let warningFlags = 0;
  if (clickbaitScore >= 50) warningFlags++;
  if (sensationalismScore >= 50) warningFlags++;
  if (fearScore >= 40) warningFlags++;
  if (angerScore >= 40) warningFlags++;
  if (biasScore >= 50) warningFlags++;

  // 1. TRUSTED
  if (isReal && confidence >= 75 && warningFlags === 0 && biasScore < 30) {
    return {
      state: "TRUSTED",
      badgeClass: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      description: "This article follows highly credible journalistic standards, maintains absolute emotional neutrality, and exhibits no clickbait indicators.",
      bullets: [
        "Low emotional alarmism & fear indexes",
        "High stylistic credibility matching standard news wires",
        "Balanced, objective, and neutral framing",
        "Zero sensational clickbait markers detected"
      ]
    };
  }

  // 2. LIKELY REAL
  if (isReal && warningFlags <= 2) {
    return {
      state: "LIKELY REAL",
      badgeClass: "text-teal-400 border-teal-500/20 bg-teal-500/10",
      description: "This content exhibits structurally credible writing patterns. Minor sensational expressions may be present but do not compromise the core text integrity.",
      bullets: [
        "Linguistic structure is structurally sound",
        "Low overall hostility & outrage metrics",
        "Minor sensational adjectives used",
        "Heuristics align with verified information channels"
      ]
    };
  }

  // 3. SUSPICIOUS
  if (isReal && warningFlags >= 3) {
    return {
      state: "SUSPICIOUS",
      badgeClass: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      description: "Linguistic patterns indicate a credible source, but with highly opinionated framing, sensational headlines, or emotional alarmism.",
      bullets: [
        "Highly opinionated or dogmatic framing",
        "Elevated sensationalism and outrage indexes",
        "Linguistic clickbait patterns detected",
        "Stance analysis indicates potential editorial bias"
      ]
    };
  }

  // 4. HIGH RISK (Fake & high warning flags)
  if (!isReal && (warningFlags >= 2 || clickbaitScore >= 50 || sensationalismScore >= 50)) {
    return {
      state: "HIGH RISK",
      badgeClass: "text-rose-400 border-rose-500/20 bg-rose-500/10",
      description: "Linguistic signature is highly correlated with online disinformation. Contains emotionally charged language, outrageous claims, and alarmist keywords.",
      bullets: [
        "High emotional alarmism & fear indexes",
        "Linguistic patterns match clickbait layouts",
        "High density of outrage-inducing words",
        "Deviates heavily from standard news wire syntax"
      ]
    };
  }

  // 5. POSSIBLY MANIPULATED (Fake but low warning flags)
  return {
    state: "POSSIBLY MANIPULATED",
    badgeClass: "text-orange-400 border-orange-500/20 bg-orange-500/10",
    description: "Linguistic attributes match a non-credible signature. Formatting or vocabulary elements raise warning flags for editorial manipulation.",
    bullets: [
      "Linguistic structure is questionable",
      "Moderate clickbait indicators found",
      "Certainty & bias flags triggered",
      "Non-standard journalistic formatting"
    ]
  };
}
