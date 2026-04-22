import { useState, useCallback, useMemo } from "react";

// ============================================================
// Word lists – expanded for far better suggestion coverage
// ============================================================

const GERMAN_WORDS = [
  // Greetings & basics
  "hallo", "hi", "hey", "guten", "morgen", "abend", "tag", "nacht", "tschüss", "bye",
  "danke", "bitte", "ja", "nein", "okay", "gut", "schlecht", "super", "toll", "cool",
  "servus", "moin", "grüße", "willkommen", "schönen", "schöne", "schönes",
  // Pronouns
  "ich", "du", "er", "sie", "es", "wir", "ihr", "mich", "dich", "sich", "uns", "euch",
  "mir", "dir", "ihm", "ihnen", "mein", "dein", "sein", "unser", "euer", "meine", "deine",
  "seine", "unsere", "eure", "meinem", "deinem", "seinem", "meinen", "deinen", "seinen",
  // Verbs – sein/haben/werden
  "bin", "bist", "ist", "sind", "seid", "war", "warst", "waren", "wart", "gewesen",
  "habe", "hast", "hat", "haben", "habt", "hatte", "hattest", "hatten", "hattet", "gehabt",
  "werde", "wirst", "wird", "werden", "werdet", "wurde", "wurdest", "wurden", "geworden",
  // Modal verbs
  "kann", "kannst", "können", "könnt", "konnte", "konntest", "konnten", "gekonnt",
  "will", "willst", "wollen", "wollt", "wollte", "wolltest", "wollten", "gewollt",
  "muss", "musst", "müssen", "müsst", "musste", "musstest", "mussten", "gemusst",
  "soll", "sollst", "sollen", "sollt", "sollte", "solltest", "sollten",
  "darf", "darfst", "dürfen", "dürft", "durfte", "durftest", "durften",
  "mag", "magst", "mögen", "mögt", "möchte", "möchtest", "möchten", "möchtet",
  // Common verbs
  "gehe", "gehst", "geht", "gehen", "ging", "gingst", "gingen", "gegangen",
  "komme", "kommst", "kommt", "kommen", "kam", "kamst", "kamen", "gekommen",
  "mache", "machst", "macht", "machen", "machte", "gemacht",
  "sage", "sagst", "sagt", "sagen", "sagte", "gesagt",
  "weiß", "weißt", "wissen", "wisst", "wusste", "gewusst",
  "denke", "denkst", "denkt", "denken", "dachte", "gedacht",
  "brauche", "brauchst", "braucht", "brauchen", "brauchte", "gebraucht",
  "finde", "findest", "findet", "finden", "fand", "gefunden",
  "glaube", "glaubst", "glaubt", "glauben", "glaubte", "geglaubt",
  "liebe", "liebst", "liebt", "lieben", "geliebt",
  "sehe", "siehst", "sieht", "sehen", "sah", "gesehen",
  "höre", "hörst", "hört", "hören", "hörte", "gehört",
  "lese", "liest", "lesen", "las", "gelesen",
  "schreibe", "schreibst", "schreibt", "schreiben", "schrieb", "geschrieben",
  "spiele", "spielst", "spielt", "spielen", "gespielt",
  "arbeite", "arbeitest", "arbeitet", "arbeiten", "gearbeitet",
  "esse", "isst", "essen", "aß", "gegessen",
  "trinke", "trinkst", "trinkt", "trinken", "trank", "getrunken",
  "schlafe", "schläfst", "schläft", "schlafen", "schlief", "geschlafen",
  "kaufe", "kaufst", "kauft", "kaufen", "kaufte", "gekauft",
  "warte", "wartest", "wartet", "warten", "wartete", "gewartet",
  "treffe", "triffst", "trifft", "treffen", "traf", "getroffen",
  "rufe", "rufst", "ruft", "rufen", "rief", "gerufen",
  "frage", "fragst", "fragt", "fragen", "fragte", "gefragt",
  "antworte", "antwortest", "antwortet", "antworten", "geantwortet",
  "bringe", "bringst", "bringt", "bringen", "brachte", "gebracht",
  "nehme", "nimmst", "nimmt", "nehmen", "nahm", "genommen",
  "gebe", "gibst", "gibt", "geben", "gab", "gegeben",
  "bleibe", "bleibst", "bleibt", "bleiben", "blieb", "geblieben",
  "fahre", "fährst", "fährt", "fahren", "fuhr", "gefahren",
  "laufe", "läufst", "läuft", "laufen", "lief", "gelaufen",
  "stehe", "stehst", "steht", "stehen", "stand", "gestanden",
  "sitze", "sitzt", "sitzen", "saß", "gesessen",
  "lege", "legst", "legt", "legen", "legte", "gelegt",
  "stelle", "stellst", "stellt", "stellen", "stellte", "gestellt",
  "öffne", "öffnest", "öffnet", "öffnen", "öffnete", "geöffnet",
  "schließe", "schließt", "schließen", "schloss", "geschlossen",
  // Question words
  "was", "wer", "wie", "wo", "wann", "warum", "weshalb", "wozu", "woher", "wohin",
  "welche", "welcher", "welches", "welchen", "welchem", "wessen", "wem", "wen",
  // Conjunctions & prepositions
  "und", "oder", "aber", "weil", "dass", "wenn", "als", "ob", "denn", "sondern",
  "obwohl", "während", "nachdem", "bevor", "damit", "falls", "sobald", "solange",
  "mit", "ohne", "für", "gegen", "über", "unter", "auf", "in", "an", "bei", "nach",
  "von", "zu", "aus", "durch", "um", "vor", "hinter", "neben", "zwischen", "trotz", "wegen",
  "innerhalb", "außerhalb", "während", "seit", "bis",
  // Time
  "heute", "morgen", "gestern", "jetzt", "gleich", "später", "bald", "immer", "nie",
  "manchmal", "oft", "selten", "meistens", "gerade", "eben", "damals",
  "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag",
  "januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september",
  "oktober", "november", "dezember", "woche", "monat", "jahr", "stunde", "minute", "sekunde",
  "wochenende", "feiertag", "geburtstag", "weihnachten", "ostern", "silvester",
  // Chat-specific
  "nachricht", "antwort", "frage", "treffen", "klar", "genau", "stimmt", "richtig",
  "falsch", "vielleicht", "natürlich", "sicher", "bestimmt", "leider", "schade",
  "egal", "echt", "wirklich", "übrigens", "eigentlich", "endlich", "trotzdem",
  "deswegen", "deshalb", "darum", "ansonsten", "außerdem", "jedoch", "allerdings",
  "freue", "freust", "freut", "freuen", "freust mich", "lustig", "witzig", "spannend",
  "interessant", "langweilig", "anstrengend", "entspannt", "müde", "wach",
  // Common nouns
  "haus", "wohnung", "zimmer", "küche", "bad", "auto", "bahn", "bus", "zug", "flugzeug",
  "arbeit", "schule", "uni", "büro", "essen", "wasser", "kaffee", "tee", "bier", "wein",
  "buch", "film", "musik", "lied", "video", "foto", "bild", "spiel",
  "freund", "freundin", "familie", "kinder", "eltern", "bruder", "schwester", "mutter", "vater",
  "oma", "opa", "tante", "onkel", "cousin", "cousine", "kollege", "kollegin", "nachbar",
  "zeit", "geld", "geschenk", "telefon", "handy", "computer", "laptop", "tablet",
  "straße", "stadt", "land", "dorf", "park", "wald", "see", "meer", "berg", "fluss",
  "hund", "katze", "tier", "vogel", "fisch", "pferd",
  // Adjectives
  "groß", "klein", "alt", "neu", "jung", "schön", "hässlich", "schnell", "langsam",
  "wichtig", "richtig", "fertig", "müde", "hungrig", "durstig", "glücklich", "traurig",
  "warm", "kalt", "heiß", "kühl", "trocken", "nass", "hell", "dunkel", "laut", "leise",
  "billig", "teuer", "leicht", "schwer", "einfach", "schwierig", "kompliziert",
  "lieb", "nett", "freundlich", "höflich", "ehrlich", "ernst", "ruhig", "wild",
  "süß", "sauer", "salzig", "scharf", "lecker", "köstlich",
  // Numbers
  "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
  "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn",
  "neunzehn", "zwanzig", "dreißig", "vierzig", "fünfzig", "hundert", "tausend",
  "erste", "zweite", "dritte", "vierte", "fünfte", "letzte",
  // Articles & particles
  "der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines",
  "kein", "keine", "keinen", "keinem", "keiner", "alle", "alles", "viele", "wenig",
  "etwas", "nichts", "jemand", "niemand", "jeder", "jede", "jedes", "manche", "einige",
  "schon", "noch", "auch", "nur", "sehr", "ganz", "ziemlich", "wirklich", "echt",
  "doch", "ja", "halt", "eben", "mal", "wohl", "eigentlich", "übrigens",
];

const ENGLISH_WORDS = [
  "hello", "hi", "hey", "good", "morning", "evening", "night", "bye", "goodbye",
  "thanks", "thank", "please", "yes", "no", "okay", "ok", "great", "cool", "awesome",
  "the", "and", "but", "for", "not", "you", "all", "can", "had", "her", "was", "one",
  "our", "out", "are", "has", "his", "how", "its", "may", "new", "now", "old", "see",
  "way", "who", "did", "get", "let", "say", "she", "too", "use", "about", "after",
  "would", "could", "should", "because", "think", "know", "want", "going", "just",
  "really", "right", "here", "there", "where", "when", "what", "which", "their",
  "will", "with", "have", "from", "this", "that", "they", "been", "some", "time",
  "very", "your", "come", "make", "like", "long", "look", "many", "then", "them",
  "these", "thing", "other", "into", "than", "only", "over", "also",
  "back", "much", "before", "must", "through", "between", "each", "never",
  "still", "something", "nothing", "everything", "always", "maybe", "today",
  "tomorrow", "yesterday", "message", "sorry", "sure", "definitely", "actually",
  "probably", "absolutely", "completely", "obviously", "honestly", "basically",
  "mom", "dad", "mother", "father", "sister", "brother", "friend", "family",
  "house", "home", "work", "school", "office", "food", "water", "coffee", "tea",
  "book", "movie", "music", "song", "video", "photo", "picture", "game",
  "love", "hate", "miss", "need", "want", "wish", "hope", "feel", "felt",
  "happy", "sad", "tired", "busy", "free", "ready", "okay", "fine", "great",
  "yeah", "nope", "yep", "nah", "indeed", "exactly", "totally", "kinda", "gonna", "wanna",
];

function getWordList(locale: string): string[] {
  if (locale.startsWith("de")) return GERMAN_WORDS;
  if (locale.startsWith("en")) return ENGLISH_WORDS;
  return [...GERMAN_WORDS, ...ENGLISH_WORDS];
}

// ============================================================
// Typo corrections – heavily expanded
// ============================================================

const CORRECTIONS_DE: Record<string, string> = {
  // Greetings
  "halo": "hallo", "halllo": "hallo", "hllo": "hallo", "hallooo": "hallo", "hallu": "hallo",
  "tschüs": "tschüss", "tschüß": "tschüss", "tschuess": "tschüss",
  // Thanks/please
  "danle": "danke", "dake": "danke", "dakne": "danke", "dnake": "danke", "dnke": "danke",
  "dankee": "danke", "dnaek": "danke",
  "btte": "bitte", "bittee": "bitte", "btite": "bitte", "bitet": "bitte",
  // Pronouns
  "ihc": "ich", "cih": "ich", "icj": "ich", "ihch": "ich",
  "udn": "und", "nud": "und", "nd": "und", "uns": "uns",
  "dei": "die", "dre": "der", "ded": "der", "deer": "der",
  "ien": "ein", "enie": "eine", "eien": "eine", "ene": "eine",
  "dsa": "das", "dass": "dass", "dss": "dass",
  // Common conjunctions
  "abre": "aber", "baer": "aber", "abr": "aber", "aebr": "aber",
  "wiel": "weil", "weli": "weil", "wiel": "weil", "weiel": "weil",
  "oder": "oder", "ode": "oder", "oedr": "oder",
  // Adjectives/adverbs
  "shcön": "schön", "schoen": "schön", "shoen": "schön", "scön": "schön",
  "nciht": "nicht", "nihct": "nicht", "ncht": "nicht", "nihc": "nicht", "ncih": "nicht",
  "nicth": "nicht", "ncihts": "nichts", "nihcts": "nichts",
  "guet": "gute", "gtu": "gut", "gtue": "gute", "guut": "gut",
  "sher": "sehr", "shre": "sehr", "sehrr": "sehr", "ser": "sehr",
  "auhc": "auch", "acuh": "auch", "uach": "auch", "ahc": "auch",
  "shcon": "schon", "shoen": "schon", "schno": "schon",
  "wirklcih": "wirklich", "wirkich": "wirklich", "wirlich": "wirklich",
  "natürlcih": "natürlich", "natürich": "natürlich", "natuerlich": "natürlich",
  "viellicht": "vielleicht", "vileicht": "vielleicht", "vlt": "vielleicht", "vllt": "vielleicht",
  "endlcih": "endlich", "endich": "endlich",
  "möglcih": "möglich", "moeglich": "möglich",
  "eigentlcih": "eigentlich", "eigentich": "eigentlich",
  "gnaz": "ganz", "gznz": "ganz",
  "imemr": "immer", "immr": "immer",
  "nei": "nie", "nei": "nie",
  // Verbs (typos)
  "mcahen": "machen", "amchen": "machen", "machne": "machen",
  "macht": "macht", "match": "macht",
  "kanst": "kannst", "kanns": "kannst", "knast": "kannst",
  "kan": "kann", "kna": "kann",
  "wiil": "will", "iwll": "will",
  "musss": "muss", "mus": "muss",
  "habn": "haben", "habne": "haben", "ahben": "haben",
  "hbe": "habe", "hbae": "habe",
  "weiss": "weiß", "weiß": "weiß", "weis": "weiß",
  "weisst": "weißt", "weisß": "weißt",
  "denek": "denke", "dneke": "denke",
  "glabe": "glaube", "glaub": "glaube",
  "frage": "frage", "frge": "frage",
  "sgae": "sage", "asge": "sage",
  "geht": "geht", "ghet": "geht", "geth": "geht",
  "gehn": "gehen", "gehne": "gehen",
  "kome": "komme", "kmme": "komme", "kommen": "kommen",
  "mochte": "möchte", "moechte": "möchte", "möcht": "möchte",
  "moegen": "mögen", "mögen": "mögen",
  "wuerde": "würde", "wuerden": "würden",
  "koennen": "können", "konnen": "können",
  "muessen": "müssen", "mussen": "müssen",
  "haette": "hätte", "haetten": "hätten",
  "waere": "wäre", "waeren": "wären",
  // Question words
  "wsa": "was", "wass": "was", "waas": "was",
  "wei": "wie", "wee": "wie",
  "wo": "wo", "wp": "wo",
  "wann": "wann", "wnan": "wann",
  "warum": "warum", "wraum": "warum", "warm": "warum",
  // Time
  "ehute": "heute", "huete": "heute", "hetue": "heute", "heut": "heute",
  "moregn": "morgen", "morgne": "morgen", "morgon": "morgen",
  "gesetrn": "gestern", "geestern": "gestern",
  "jezt": "jetzt", "jezzt": "jetzt", "jezzt": "jetzt",
  // Articles/particles
  "nru": "nur", "nuur": "nur", "nrr": "nur",
  "mti": "mit", "imt": "mit", "mt": "mit",
  "fü": "für", "fue": "für", "fr": "für", "feur": "für",
  "kien": "kein", "kein": "kein", "kine": "keine",
  "alels": "alles", "ales": "alles",
  "etwa": "etwas", "etws": "etwas",
  "scon": "schon",
  // Common nouns (typos)
  "famile": "familie", "famillie": "familie",
  "freudn": "freund", "freudin": "freundin",
  "arbiet": "arbeit", "arbet": "arbeit",
  "schuel": "schule", "shcule": "schule",
  "hadny": "handy", "haandy": "handy",
  "telfon": "telefon", "telefn": "telefon",
  "wasrer": "wasser", "wassser": "wasser",
  "kafee": "kaffee", "kaffe": "kaffee", "caffee": "kaffee",
  "geburstag": "geburtstag", "gebrutstag": "geburtstag",
  // Particles for chat
  "libe": "liebe", "leibe": "liebe", "leib": "lieb",
  "genua": "genau", "gneua": "genau", "ganu": "genau",
  "okai": "okay", "oki": "okay", "okey": "okay",
  "jaa": "ja", "jaaa": "ja", "jaja": "ja",
  "neee": "nein", "neeein": "nein", "ne": "nein",
  "lol": "lol", "haha": "haha", "hehe": "hehe",
  // Common bigram errors
  "iwe": "wie", "iwie": "wie",
  "isn": "ist", "ize": "ist",
  "machts": "machst", "macht's": "macht's",
};

const CORRECTIONS_EN: Record<string, string> = {
  // Articles
  "teh": "the", "hte": "the", "tje": "the", "thr": "the",
  "taht": "that", "tath": "that", "thta": "that",
  "thier": "their", "tehir": "their", "theyr": "they're", "theire": "their",
  "thier": "their",
  // Conjunctions
  "becuase": "because", "becasue": "because", "becuse": "because", "beacuse": "because",
  "wiht": "with", "whit": "with", "wth": "with", "iwth": "with",
  "adn": "and", "nad": "and", "nd": "and", "anf": "and",
  "jsut": "just", "juts": "just", "jst": "just",
  // Common typos
  "definately": "definitely", "definetly": "definitely", "definately": "definitely",
  "recieve": "receive", "recive": "receive", "recieved": "received",
  "seperate": "separate", "seprate": "separate", "seperately": "separately",
  "occured": "occurred", "occuring": "occurring", "occurence": "occurrence",
  "tomorow": "tomorrow", "tommorow": "tomorrow", "tommorrow": "tomorrow",
  "yesteday": "yesterday", "yestreday": "yesterday",
  "mesage": "message", "messge": "message", "messege": "message", "mesages": "messages",
  "alot": "a lot", "alittle": "a little",
  "untill": "until", "untli": "until",
  "finaly": "finally", "finallly": "finally",
  "realy": "really", "realllly": "really",
  "verry": "very", "vry": "very",
  "knwo": "know", "konw": "know", "noe": "know",
  "thign": "thing", "thign": "thing", "thigns": "things",
  "freind": "friend", "frend": "friend", "freinds": "friends",
  "becouse": "because", "cuz": "because",
  "thru": "through", "thrugh": "through",
  "thouhg": "though", "thoght": "thought",
  "wierd": "weird", "wierd": "weird",
  "tho": "though",
  "wat": "what", "wht": "what", "waht": "what",
  "wich": "which", "wihc": "which",
  "ur": "your", "u": "you", "r": "are",
  "thx": "thanks", "ty": "thanks",
  "plz": "please", "pls": "please",
  "k": "ok", "kk": "ok", "okk": "ok",
  "yea": "yeah", "yh": "yeah",
  // Contractions
  "dont": "don't", "doesnt": "doesn't", "didnt": "didn't",
  "cant": "can't", "wont": "won't", "wouldnt": "wouldn't",
  "couldnt": "couldn't", "shouldnt": "shouldn't",
  "isnt": "isn't", "arent": "aren't", "wasnt": "wasn't", "werent": "weren't",
  "hasnt": "hasn't", "havent": "haven't", "hadnt": "hadn't",
  "im": "I'm", "ive": "I've", "ill": "I'll", "id": "I'd",
  "youre": "you're", "youve": "you've", "youll": "you'll", "youd": "you'd",
  "theyre": "they're", "theyve": "they've", "theyll": "they'll", "theyd": "they'd",
  "weve": "we've", "well": "we'll", "wed": "we'd",
  "hes": "he's", "shes": "she's", "its": "it's",
  "lets": "let's", "thats": "that's", "whats": "what's", "wheres": "where's",
  // Common
  "alright": "alright", "allright": "all right",
  "everyones": "everyone's", "anyones": "anyone's",
  "soemthing": "something", "somthing": "something", "somting": "something",
  "anytihng": "anything", "anyhting": "anything",
};

function getCorrections(locale: string): Record<string, string> {
  if (locale.startsWith("de")) return CORRECTIONS_DE;
  if (locale.startsWith("en")) return CORRECTIONS_EN;
  return { ...CORRECTIONS_DE, ...CORRECTIONS_EN };
}

// ============================================================
// Levenshtein distance for fuzzy matching
// ============================================================

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 2) return 99; // early exit – too far apart
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

// Preserve original capitalization when applying a correction
function preserveCase(original: string, replacement: string): string {
  if (!original) return replacement;
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
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
    const seen = new Set<string>();

    // Prefix matches (highest priority)
    for (const word of wordList) {
      if (word.startsWith(currentWord) && word !== currentWord && !seen.has(word)) {
        results.push({ word, score: 0 });
        seen.add(word);
      }
    }

    // Fuzzy matches (lower priority) – only if few prefix matches
    if (results.length < 3 && currentWord.length >= 3) {
      for (const word of wordList) {
        if (seen.has(word)) continue;
        const dist = levenshtein(currentWord, word);
        if (dist <= 2 && dist > 0) {
          results.push({ word, score: dist + 1 });
          seen.add(word);
        }
      }
    }

    // Sort: prefix first, then by distance, then shorter first
    results.sort((a, b) => a.score - b.score || a.word.length - b.word.length);

    return results.slice(0, 3).map((r) => r.word);
  }, [enabled, wordList, getCurrentWord]);

  // Auto-correct: typo fix + auto-capitalize sentence start + double-space → ". "
  const autoCorrect = useCallback((text: string): string | null => {
    if (!enabled) return null;

    // ── Rule 1: double space → ". " (iOS-style) ─────────────
    if (text.endsWith("  ") && text.length >= 3) {
      const beforeDouble = text.slice(0, -2);
      const lastChar = beforeDouble.slice(-1);
      // Only insert period if the previous char is a letter/digit (not punctuation)
      if (lastChar && /[a-zA-Z0-9äöüÄÖÜß]/.test(lastChar)) {
        return beforeDouble + ". ";
      }
    }

    // Only run word-correction after a space (user finished typing)
    if (!text.endsWith(" ")) return null;

    const trimmed = text.trimEnd();
    const words = trimmed.split(/\s/);
    const lastWordRaw = words[words.length - 1] || "";
    const lastWord = lastWordRaw.toLowerCase();

    // ── Rule 2: typo correction on the last word ────────────
    let nextWords = words;
    let changed = false;

    if (lastWord.length >= 2) {
      const correction = corrections[lastWord];
      if (correction && correction !== lastWord) {
        nextWords = [...words];
        nextWords[nextWords.length - 1] = preserveCase(lastWordRaw, correction);
        changed = true;
      }
    }

    // ── Rule 3: auto-capitalize first word of a sentence ───
    // Sentence start = position 0 OR previous non-empty token ends with .!?
    for (let i = 0; i < nextWords.length; i++) {
      const w = nextWords[i];
      if (!w) continue;
      const isStart = i === 0;
      const prev = i > 0 ? nextWords[i - 1] : "";
      const afterPunct = prev && /[.!?]$/.test(prev);
      if ((isStart || afterPunct) && w[0] && w[0] !== w[0].toUpperCase()) {
        // Only capitalize alphabetic first char
        if (/[a-zäöüß]/.test(w[0])) {
          nextWords = i === 0 && nextWords === words ? [...words] : nextWords;
          nextWords[i] = w[0].toUpperCase() + w.slice(1);
          changed = true;
        }
      }
    }

    if (!changed) return null;
    return nextWords.join(" ") + " ";
  }, [enabled, corrections]);

  // Apply a suggestion: replace current partial word with the suggestion
  const applySuggestion = useCallback((text: string, suggestion: string): string => {
    const words = text.split(/\s/);
    const currentRaw = words[words.length - 1] || "";
    words[words.length - 1] = preserveCase(currentRaw, suggestion);
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
