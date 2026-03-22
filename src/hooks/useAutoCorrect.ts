import { useState, useCallback, useMemo } from "react";

// Common German words dictionary for suggestions
const GERMAN_WORDS = [
  // Greetings & basics
  "hallo", "hi", "hey", "guten", "morgen", "abend", "tag", "nacht", "tschüss", "bye",
  "danke", "bitte", "ja", "nein", "okay", "gut", "schlecht", "super", "toll", "cool",
  // Pronouns
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mich", "dich", "sich", "uns", "euch",
  "mir", "dir", "ihm", "ihr", "ihnen", "mein", "dein", "sein", "unser", "euer",
  // Common verbs
  "bin", "bist", "ist", "sind", "seid", "habe", "hast", "hat", "haben", "habt",
  "kann", "kannst", "können", "könnt", "will", "willst", "wollen", "wollt",
  "muss", "musst", "müssen", "müsst", "soll", "sollst", "sollen", "sollt",
  "werde", "wirst", "wird", "werden", "werdet",
  "gehe", "gehst", "geht", "gehen", "komme", "kommst", "kommt", "kommen",
  "mache", "machst", "macht", "machen", "sage", "sagst", "sagt", "sagen",
  "weiß", "weißt", "wissen", "wisst", "denke", "denkst", "denkt", "denken",
  "brauche", "brauchst", "braucht", "brauchen", "finde", "findest", "findet", "finden",
  "glaube", "glaubst", "glaubt", "glauben", "liebe", "liebst", "liebt", "lieben",
  "sehe", "siehst", "sieht", "sehen", "höre", "hörst", "hört", "hören",
  "lese", "liest", "lesen", "schreibe", "schreibst", "schreibt", "schreiben",
  "spiele", "spielst", "spielt", "spielen", "arbeite", "arbeitest", "arbeitet", "arbeiten",
  "esse", "isst", "essen", "trinke", "trinkst", "trinkt", "trinken",
  "schlafe", "schläfst", "schläft", "schlafen", "kaufe", "kaufst", "kauft", "kaufen",
  "warte", "wartest", "wartet", "warten", "treffe", "triffst", "trifft", "treffen",
  // Question words
  "was", "wer", "wie", "wo", "wann", "warum", "woher", "wohin", "welche", "welcher",
  // Conjunctions & prepositions
  "und", "oder", "aber", "weil", "dass", "wenn", "als", "ob", "denn", "sondern",
  "mit", "ohne", "für", "gegen", "über", "unter", "auf", "in", "an", "bei", "nach",
  "von", "zu", "aus", "durch", "um", "vor", "hinter", "neben", "zwischen",
  // Time
  "heute", "morgen", "gestern", "jetzt", "gleich", "später", "bald", "immer", "nie",
  "manchmal", "oft", "selten", "montag", "dienstag", "mittwoch", "donnerstag",
  "freitag", "samstag", "sonntag", "woche", "monat", "jahr",
  // Chat-specific
  "nachricht", "antwort", "frage", "treffen", "klar", "genau", "stimmt", "richtig",
  "falsch", "vielleicht", "natürlich", "sicher", "bestimmt", "leider", "schade",
  "egal", "echt", "wirklich", "gerade", "übrigens", "eigentlich", "endlich",
  // Common nouns
  "haus", "auto", "arbeit", "schule", "essen", "wasser", "buch", "film", "musik",
  "freund", "freundin", "familie", "kinder", "eltern", "bruder", "schwester",
  "zeit", "geld", "telefon", "handy", "computer", "straße", "stadt", "land",
  // Adjectives
  "groß", "klein", "alt", "neu", "jung", "schön", "schnell", "langsam",
  "wichtig", "richtig", "fertig", "müde", "hungrig", "glücklich", "traurig",
  // Numbers
  "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
];

// Common English words
const ENGLISH_WORDS = [
  "hello", "hi", "hey", "good", "morning", "evening", "night", "bye", "goodbye",
  "thanks", "thank", "please", "yes", "no", "okay", "good", "bad", "great", "cool",
  "the", "and", "but", "for", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "are", "has", "his", "how", "its", "may", "new", "now", "old", "see",
  "way", "who", "did", "get", "let", "say", "she", "too", "use", "about", "after",
  "would", "could", "should", "because", "think", "know", "want", "going", "just",
  "really", "right", "here", "there", "where", "when", "what", "which", "their",
  "will", "with", "have", "from", "this", "that", "they", "been", "some", "time",
  "very", "your", "come", "make", "like", "long", "look", "many", "then", "them",
  "these", "thing", "could", "other", "into", "than", "only", "over", "also",
  "back", "much", "before", "must", "through", "between", "each", "never",
  "still", "something", "nothing", "everything", "always", "maybe", "today",
  "tomorrow", "yesterday", "message", "sorry", "sure", "definitely", "actually",
];

// Common typo corrections (German)
const CORRECTIONS_DE: Record<string, string> = {
  "halo": "hallo", "halllo": "hallo", "hllo": "hallo",
  "tschüs": "tschüss", "tschüß": "tschüss",
  "danle": "danke", "dake": "danke", "dakne": "danke",
  "btte": "bitte", "bittee": "bitte",
  "ihc": "ich", "cih": "ich",
  "udn": "und", "nud": "und",
  "abre": "aber", "baer": "aber",
  "wiel": "weil", "weli": "weil",
  "dsa": "das", "dss": "dass",
  "shcön": "schön", "schon": "schön",
  "nciht": "nicht", "nihct": "nicht", "ncht": "nicht",
  "mcahen": "machen", "amchen": "machen",
  "guet": "gute", "gtu": "gut",
  "ehute": "heute", "huete": "heute",
  "moregn": "morgen", "morgne": "morgen",
  "sher": "sehr", "shre": "sehr",
  "auhc": "auch", "acuh": "auch",
  "wsa": "was", "wass": "was",
  "dei": "die", "dre": "der",
  "ien": "ein", "enie": "eine",
  "nru": "nur", "nuur": "nur",
  "mti": "mit", "mti": "mit",
  "fü": "für", "fue": "für",
  "shcon": "schon", "scohn": "schon",
  "libe": "liebe", "leibe": "liebe",
  "wekr": "werk", "wrk": "werk",
  "kien": "kein", "keine": "keine",
  "wirklcih": "wirklich", "wirkich": "wirklich",
  "genua": "genau", "gneua": "genau",
  "viellicht": "vielleicht", "vileicht": "vielleicht",
  "natürlcih": "natürlich", "natürich": "natürlich",
};

const CORRECTIONS_EN: Record<string, string> = {
  "teh": "the", "hte": "the",
  "taht": "that", "tath": "that",
  "thier": "their", "tehir": "their",
  "becuase": "because", "becasue": "because",
  "definately": "definitely", "definetly": "definitely",
  "recieve": "receive", "recive": "receive",
  "seperate": "separate", "seprate": "separate",
  "occured": "occurred", "occured": "occurred",
  "tomorow": "tomorrow", "tommorow": "tomorrow",
  "mesage": "message", "messge": "message",
  "wiht": "with", "whit": "with",
  "adn": "and", "nad": "and",
  "jsut": "just", "juts": "just",
  "dont": "don't", "doesnt": "doesn't", "cant": "can't", "wont": "won't",
  "im": "I'm", "ive": "I've", "ill": "I'll",
  "youre": "you're", "theyre": "they're", "weve": "we've",
};

function getWordList(locale: string): string[] {
  if (locale.startsWith("de")) return GERMAN_WORDS;
  if (locale.startsWith("en")) return ENGLISH_WORDS;
  return [...GERMAN_WORDS, ...ENGLISH_WORDS];
}

function getCorrections(locale: string): Record<string, string> {
  if (locale.startsWith("de")) return CORRECTIONS_DE;
  if (locale.startsWith("en")) return CORRECTIONS_EN;
  return { ...CORRECTIONS_DE, ...CORRECTIONS_EN };
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

export function useAutoCorrect(locale: string = "de", enabled: boolean = true) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const wordList = useMemo(() => getWordList(locale), [locale]);
  const corrections = useMemo(() => getCorrections(locale), [locale]);

  // Get the current word being typed (last word in text)
  const getCurrentWord = useCallback((text: string): string => {
    const words = text.split(/\s/);
    return words[words.length - 1]?.toLowerCase() || "";
  }, []);

  // Generate suggestions for a partial word
  const getSuggestions = useCallback((text: string): string[] => {
    if (!enabled) return [];
    const currentWord = getCurrentWord(text);
    if (currentWord.length < 2) return [];

    const results: { word: string; score: number }[] = [];

    // Prefix matches (highest priority)
    for (const word of wordList) {
      if (word.startsWith(currentWord) && word !== currentWord) {
        results.push({ word, score: 0 });
      }
    }

    // Fuzzy matches (lower priority) - only if few prefix matches
    if (results.length < 3 && currentWord.length >= 3) {
      for (const word of wordList) {
        if (word.startsWith(currentWord)) continue; // already added
        const dist = levenshtein(currentWord, word);
        if (dist <= 2 && dist > 0) {
          results.push({ word, score: dist });
        }
      }
    }

    // Sort by score (prefix first, then by distance)
    results.sort((a, b) => a.score - b.score || a.word.length - b.word.length);

    return results.slice(0, 3).map((r) => r.word);
  }, [enabled, wordList, getCurrentWord]);

  // Auto-correct the last word if it's a known typo
  const autoCorrect = useCallback((text: string): string | null => {
    if (!enabled) return null;
    
    // Only correct after space (user finished typing the word)
    if (!text.endsWith(" ")) return null;
    
    const words = text.trimEnd().split(/\s/);
    const lastWord = words[words.length - 1]?.toLowerCase();
    if (!lastWord || lastWord.length < 2) return null;

    const correction = corrections[lastWord];
    if (correction && correction !== lastWord) {
      words[words.length - 1] = correction;
      return words.join(" ") + " ";
    }

    return null;
  }, [enabled, corrections]);

  // Apply a suggestion: replace current partial word with the suggestion
  const applySuggestion = useCallback((text: string, suggestion: string): string => {
    const words = text.split(/\s/);
    words[words.length - 1] = suggestion;
    return words.join(" ") + " ";
  }, []);

  // Update suggestions based on current text
  const updateSuggestions = useCallback((text: string) => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }
    const newSuggestions = getSuggestions(text);
    setSuggestions(newSuggestions);
  }, [enabled, getSuggestions]);

  return {
    suggestions,
    updateSuggestions,
    autoCorrect,
    applySuggestion,
  };
}
