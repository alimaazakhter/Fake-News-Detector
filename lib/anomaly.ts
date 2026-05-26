export interface AnomalyResult {
  isAnomaly: boolean;
  warning: string | null;
  probabilityPenalty: number; // multiplier or subtraction value
  sensationalismBonus: number; // value to add to sensationalism score
}

// Regex patterns to detect unrealistic, impossible, or absurd claims
const ANOMALY_PATTERNS = [
  // 1. Celebrity/Billionaire + Impossible Celestial Transactions
  {
    regex: /(ronaldo|messi|elon\s+musk|musk|jeff\s+bezos|bezos|zuckerberg|bill\s+gates|gates|taylor\s+swift|swift|celebrity|celebrities|billionaire|billionaires|human|humans)\s+(buys?|purchases?|acquires?|sells?|renting|rented|owns?|owned)\s+(the\s+)?(moon|sun|mars|venus|jupiter|saturn|neptune|uranus|pluto|ocean|oceans|space|galaxy|solar\s+system|milky\s+way)/gi,
    warning: "Potential unrealistic or factually impossible transaction detected."
  },
  
  // 2. Impossible Space/Alien Political/Social Events
  {
    regex: /(alien|aliens|extraterrestrial|extraterrestrials|martian|martians|ufo|ufos|zombie|zombies|vampire|vampires)\s+(elected|running\s+for|invaded|invading|invade|kidnapped|kidnap|takeover|taking\s+over|rule|rules|governing|govern|elected\s+as\s+president|president|senator|mayor)/gi,
    warning: "Potential unrealistic or supernatural political/social claim detected."
  },
  
  // 3. Absurd Biological / Human Survival Claims
  {
    regex: /(survive|live|sleep|stay\s+awake|breathe)\s+without\s+(sleep|food|water|air|oxygen|eating|drinking|heartbeat)\s+for\s+\d+\s+(days|weeks|months|years|hours)/gi,
    warning: "Factually impossible biological survival claim detected."
  },
  
  // 4. Absurd Miracle Cures
  {
    regex: /(cures?|heal|heals|eradicates?|cure\s+for)\s+all\s+(cancer|cancers|aids|hiv|diseases?|illness|illnesses|diabetes|blindness)\s+(instantly|overnight|with\s+water|using\s+herbs)/gi,
    warning: "Potential unverified miracle health claim detected."
  },
  
  // 5. Doomsday / World-Ending statements
  {
    regex: /(asteroid|comet|meteor)\s+(will\s+)?(destroy|wipe\s+out|collision\s+with|explode)\s+(the\s+)?earth\s+(tomorrow|next\s+week|in\s+\d+\s+days)/gi,
    warning: "Sensationalist doomsday claim detected."
  },
  
  // 6. Impossible Celestial Disasters
  {
    regex: /(moon|sun|earth|solar\s+system)\s+(will\s+)?(explodes?|implodes?|shatters?|goes\s+out|dying|disappear|disappeared|extinguishes)/gi,
    warning: "Unrealistic cosmic disaster claim detected."
  },
  
  // 7. General Absurd/Supernatural Claims (Aliens captured/cloned dinosaurs)
  {
    regex: /(cloned|cloning|clone)\s+(dinosaurs?|mammoths?|vampires?|zombies?|historical\s+figures?)/gi,
    warning: "Unrealistic science or cloning claim detected."
  }
];

export function detectAnomaly(text: string): AnomalyResult {
  if (!text || text.trim() === "") {
    return {
      isAnomaly: false,
      warning: null,
      probabilityPenalty: 0,
      sensationalismBonus: 0
    };
  }

  const cleanedText = text.toLowerCase().replace(/\s+/g, " ").trim();

  for (const pattern of ANOMALY_PATTERNS) {
    if (pattern.regex.test(cleanedText)) {
      return {
        isAnomaly: true,
        warning: "Potential unrealistic or factually impossible claim detected.",
        probabilityPenalty: 0.65, // subtract 65% from the real probability (forces FAKE style)
        sensationalismBonus: 40 // boost sensationalism index
      };
    }
  }

  return {
    isAnomaly: false,
    warning: null,
    probabilityPenalty: 0,
    sensationalismBonus: 0
  };
}
