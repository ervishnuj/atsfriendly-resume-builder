import {
  computeAtsScores, containsTerm, normalizeText, normalizeTerm,
  type AtsExtraction, type AtsScoreResult,
} from "@/lib/ats-scoring";

export type RequirementCategory = "Core technical skills" | "Frameworks, libraries, and tools" | "Databases and technologies" | "Job responsibilities" | "Required qualifications" | "Preferred skills" | "Generic or low-relevance phrases";
export type JobRequirement = {
  term: string;
  category: RequirementCategory;
  importance: "Required" | "Relevant" | "Preferred";
  context: string;
};
export type QuickAtsResult = AtsScoreResult & {
  keywordsChecked: number;
  wordCount: number;
  evidence: Record<string, string>;
  requirements: JobRequirement[];
  ignoredPhrases: string[];
};

const GENERIC = new Set(`a an the and or but if then than that this those these of in on at to for with without from by as is are was were be been being will shall can could should would may might must have has had do does did not no you your our we they he she it its their his her them us who whom which what when where why how all any both each few more most other some such only own same so too very just about into over under again further once here there during before after above below off out up down also per via etc role roles job jobs work working works experience experienced years year team teams strong excellent good ability able skills skill knowledge understanding candidate candidates ideal plus preferred required requirements responsibilities responsibility qualifications company position opportunity join looking help ensure using use used across within new including activities activity active backlogs engineering software applications application development develop developing build building perform performing participate participating maintain maintaining support supporting collaborate collaborating relevant related demonstrated familiarity proficiency expertise hands on proven minimum essential degree bachelor bachelors master masters diploma education equivalent field fields computer science discipline disciplines desirable bonus nice advantage practical exposure seeking talented motivated passion competitive benefits salary inclusive culture equal employer employment success successful solutions solution environment environments complex scalable robust high quality design designing implementation implement implementing testing test debugging debug reviews review tools technologies frameworks libraries programming language languages database databases technology framework library tool technical daily tasks duties responsible involves involves`.split(/\s+/));
const REQUIRED = /\b(must|required|requirements?|essential|minimum|proficien\w*|expertise|strong experience)\b/i;
const PREFERRED = /\b(preferred|nice.to.have|bonus|plus|desirable|advantage|optional)\b/i;
const TITLE = /\b(engineer|developer|manager|analyst|designer|consultant|architect|scientist|administrator|specialist|lead|intern|associate|director|officer)\b/i;
const DEGREE = /\b(bachelor'?s?|master'?s?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|bca|mca|mba|phd|degree|diploma|university|college)\b/i;

// A cross-role phrase vocabulary identifies boundaries/categories, not a target JD.
// Unlisted requirements are also extracted from requirement lists and skill contexts.
const PHRASES: [RegExp, string, RequirementCategory][] = [
  [/\bspring[ -]?boot\b/gi, "spring boot", "Frameworks, libraries, and tools"],
  [/\brest(?:ful)?\s+apis?\b/gi, "rest api", "Core technical skills"],
  [/\b(?:node\.?js|node\.js)\b/gi, "node js", "Frameworks, libraries, and tools"],
  [/\breact(?:\.?js)?\b/gi, "react", "Frameworks, libraries, and tools"],
  [/\b(?:ci\s*\/\s*cd|continuous integration(?:\s+and\s+(?:continuous\s+)?delivery)?)\b/gi, "cicd", "Databases and technologies"],
  [/\b(?:amazon web services|aws)\b/gi, "aws", "Databases and technologies"],
  [/\b(?:google cloud(?: platform)?|gcp)\b/gi, "google cloud", "Databases and technologies"],
  [/\b(?:kubernetes|k8s)\b/gi, "kubernetes", "Frameworks, libraries, and tools"],
  [/\b(?:postgresql|postgres)\b/gi, "postgresql", "Databases and technologies"],
  [/\b(?:my\s*sql)\b/gi, "mysql", "Databases and technologies"],
  [/\b(?:sql server|ms sql)\b/gi, "sql server", "Databases and technologies"],
  [/\b(?:code reviews?|review(?:ing)? code)\b/gi, "code review", "Job responsibilities"],
  [/\b(?:unit tests?|unit testing)\b/gi, "unit testing", "Job responsibilities"],
  [/\b(?:integration tests?|integration testing)\b/gi, "integration testing", "Job responsibilities"],
  [/\bdebug(?:ging)?\b/gi, "debugging", "Job responsibilities"],
  [/\b(?:test(?:ing)? and develop(?:ment|ing)|software development|develop(?:ing)? software)\b/gi, "software development", "Job responsibilities"],
  [/\b(?:test automation|automated testing)\b/gi, "test automation", "Job responsibilities"],
  [/\b(?:data analysis|analy[sz](?:e|ing) data)\b/gi, "data analysis", "Core technical skills"],
  [/\b(?:machine learning|deep learning|data engineering|feature engineering|prompt engineering|civil engineering|mechanical engineering|electrical engineering|computer science|quality assurance|project management|product management|customer service|financial reporting|risk management|digital marketing|search engine optimization)\b/gi, "", "Core technical skills"],
  [/\b(?:c\+\+|c#|\.net)\b|(?<![a-z0-9])(?:c\+\+|c#|\.net)(?![a-z0-9])/gi, "", "Core technical skills"],
];
const FRAMEWORKS = new Set("spring hibernate angular vue django flask fastapi express next.js docker git github jenkins junit pytest selenium playwright pytorch tensorflow pandas numpy figma tableau powerbi excel jira ansible terraform spark kafka dbt airflow snowflake salesforce sap".split(" "));
const DATABASES = new Set("sql mysql postgresql mongodb redis oracle sqlite dynamodb elasticsearch azure linux unix networking microservices".split(" "));
const CORE = new Set("java javascript typescript python kotlin scala golang rust ruby php swift html css bash matlab sas spss accounting bookkeeping copywriting seo".split(" "));
const categoryFor = (term: string): RequirementCategory => FRAMEWORKS.has(term) ? "Frameworks, libraries, and tools" : DATABASES.has(term) ? "Databases and technologies" : "Core technical skills";
const categoryRank = (category: RequirementCategory) => ["Core technical skills", "Frameworks, libraries, and tools", "Databases and technologies", "Job responsibilities", "Required qualifications", "Preferred skills", "Generic or low-relevance phrases"].indexOf(category);

function lines(text: string): string[] {
  return text.split(/\r?\n+/).map(line => line.replace(/^[\s\u2022\u25cf*+-]+/, "").trim()).filter(Boolean);
}

export function extractJobRequirements(jd: string): { requirements: JobRequirement[]; ignoredPhrases: string[] } {
  const found = new Map<string, JobRequirement>();
  const ignored = new Set<string>();
  let section: "Required" | "Relevant" | "Preferred" = "Relevant";
  const add = (term: string, category: RequirementCategory, importance: JobRequirement["importance"], context: string) => {
    const key = normalizeTerm(term);
    if (!key || key.length < 2 || (GENERIC.has(key) && category !== "Job responsibilities" && category !== "Required qualifications")) return;
    const prior = found.get(key);
    const rank = { Required: 0, Relevant: 1, Preferred: 2 };
    if (!prior || rank[importance] < rank[prior.importance]) found.set(key, { term: key, category, importance, context });
  };
  for (const line of lines(jd)) {
    // Section labels carry importance across bullets, but a sentence-level label does not leak.
    if (/^(?:required skills|requirements|minimum qualifications|essential skills|qualifications|required)\s*:?$/i.test(line)) { section = "Required"; continue; }
    if (/^(?:preferred skills|preferred qualifications|nice.to.have|bonus|preferred)\s*:?$/i.test(line)) { section = "Preferred"; continue; }
    if (/^(?:responsibilities|duties|about us|benefits|what you.ll do)\s*:?$/i.test(line)) { section = "Relevant"; continue; }
    if (/^(?:benefits|about (?:us|the company)|we offer|salary|equal opportunity)\b/i.test(line)) continue;
    // Split optional tails separately so 'Java required; Python preferred' is never all optional.
    for (const context of line.split(/;\s*|(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean)) {
      const importance = REQUIRED.test(context) ? "Required" : PREFERRED.test(context) ? "Preferred" : section;
      if (TITLE.test(context) && context.length <= 80 && !/[:,]|\b(using|with|skills|required|preferred)\b/i.test(context)) continue;
      let remaining = context;
      for (const [pattern, canonical, category] of PHRASES) {
        remaining = remaining.replace(pattern, match => { add(canonical || match, category, importance, context); return " ".repeat(match.length); });
      }
      // Preserve unlisted domain phrases containing otherwise generic words.
      remaining = remaining.replace(/\b(?:[a-z]+\s+engineering|[a-z]+\s+(?:testing|management|analysis|reporting|certification))\b/gi, match => {
        if (match.split(/\s+/).every(token => GENERIC.has(token.toLowerCase()))) return match;
        add(match, /testing/i.test(match) ? "Job responsibilities" : /certification/i.test(match) ? "Required qualifications" : "Core technical skills", importance, context);
        return " ".repeat(match.length);
      });
      if (DEGREE.test(context) && /\b(degree|bachelor|master|diploma|b\.?tech|m\.?tech|phd|b\.?sc|m\.?sc)\b/i.test(context)) {
        const degree = context.match(/(?:bachelor'?s?|master'?s?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|phd|diploma)(?:\s+degree)?(?:\s+in\s+[a-z &]+?(?=\s+(?:or|is|required|preferred)|[,.;]|$))?/i)?.[0];
        if (degree) add(degree, "Required qualifications", importance, context);
        remaining = remaining.replace(/(?:bachelor'?s?|master'?s?|b\.?tech|m\.?tech|b\.?sc|m\.?sc|phd|diploma)(?:\s+degree)?/gi, " ");
      }
      const tokens = remaining.match(/[a-zA-Z][a-zA-Z0-9.+#-]*|[,/()]/g) ?? [];
      const contextual = importance !== "Relevant" || /\b(skills?|experience|knowledge|proficiency|familiarity|using|tools?|technologies|frameworks?|libraries|databases?|certification|certified)\b/i.test(context);
      let chunk: string[] = [];
      const flush = () => {
        if (!chunk.length) return;
        const term = chunk.join(" ");
        if (contextual && chunk.length <= 4 && chunk.some(token => !GENERIC.has(token.toLowerCase()))) add(term, categoryFor(normalizeTerm(term)), importance, context);
        chunk = [];
      };
      for (const token of tokens) {
        if (/^[,/()]$/.test(token)) { flush(); continue; }
        const key = normalizeTerm(token);
        if (CORE.has(key) || FRAMEWORKS.has(key) || DATABASES.has(key)) { flush(); add(key, categoryFor(key), importance, context); }
        else if (GENERIC.has(key) || /^\d/.test(key) || /^(?:ing|ed)$/.test(key)) { flush(); if (["including", "activities", "engineering", "backlogs", "active"].includes(key)) ignored.add(key); }
        else chunk.push(token);
      }
      flush();
    }
  }
  const requirements = [...found.values()].sort((a, b) => {
    const importanceRank = { Required: 0, Relevant: 1, Preferred: 2 };
    return importanceRank[a.importance] - importanceRank[b.importance] || categoryRank(a.category) - categoryRank(b.category) || a.term.localeCompare(b.term);
  }).slice(0, 60);
  return { requirements, ignoredPhrases: [...ignored] };
}

// Equivalent task phrasing only; Java never matches JavaScript, and no broad semantic inference.
function evidenceFor(text: string, term: string): string | undefined {
  const equivalents: Record<string, string[]> = {
    "code review": ["code reviews", "reviewed code", "reviewing code"],
    "unit testing": ["unit tests", "unit test"],
    "integration testing": ["integration tests", "integration test"],
    "debugging": ["debugged", "debug"],
    "software development": ["developed software", "developing software"],
    "test automation": ["automated testing", "automated tests"],
    "data analysis": ["analyzed data", "analysed data"],
    "cicd": ["ci/cd", "continuous integration and continuous delivery", "continuous integration and delivery"],
    "bachelor": ["bachelors", "bachelor degree", "bachelor's degree", "b.tech", "btech", "bca", "b.sc", "bsc"],
    "bachelor degree": ["bachelors", "bachelor's degree", "b.tech", "btech", "bca", "b.sc", "bsc"],
    "bachelors degree": ["bachelor degree", "b.tech", "btech", "bca", "b.sc", "bsc"],
    "master degree": ["master's degree", "m.tech", "mtech", "msc", "mca", "mba"],
  };
  return lines(text).find(line => !/\b(no experience|never used|not familiar|do not know|don't know|without experience)\b/i.test(line) && [term, ...(equivalents[term] ?? [])].some(variant => containsTerm(normalizeText(line), variant)));
}
function yearsFrom(text: string, allowDateSpan = false): number {
  const match = text.match(/(\d{1,2})\s*\+?\s*(?:to|-|–)?\s*\d{0,2}\s*(?:years?|yrs?)/i);
  if (match) return Number(match[1]) || 0;
  if (!allowDateSpan) return 0;
  // Only employment date ranges, not a span between education/graduation dates.
  const employment = text.split(/\b(?:experience|employment|work history)\b/i)[1]?.split(/\b(?:education|certifications|projects)\b/i)[0] ?? "";
  const ranges = [...employment.matchAll(/\b((?:19|20)\d{2})\s*[-–]\s*((?:19|20)\d{2}|present|current)\b/gi)];
  const intervals = ranges.map(match => [Number(match[1]), /present|current/i.test(match[2]) ? new Date().getUTCFullYear() : Number(match[2])]).sort((a, b) => a[0] - b[0]);
  let end = 0, total = 0;
  for (const [start, finish] of intervals) { total += Math.max(0, finish - Math.max(start, end)); end = Math.max(end, finish); }
  return total;
}

export function quickAtsCheck(resumeText: string, jobDescription: string): QuickAtsResult {
  const { requirements, ignoredPhrases } = extractJobRequirements(jobDescription);
  const resumeLines = lines(resumeText);
  const jdLines = lines(jobDescription);
  const skills = requirements.filter(item => item.category !== "Job responsibilities" && item.category !== "Required qualifications");
  const responsibilities = requirements.filter(item => item.category === "Job responsibilities");
  const qualifications = requirements.filter(item => item.category === "Required qualifications");
  const requiredSkills = skills.filter(item => item.importance !== "Preferred").map(item => item.term);
  const evidence: Record<string, string> = {};
  for (const item of requirements) { const quote = evidenceFor(resumeText, item.term); if (quote) evidence[item.term] = quote; }
  const extraction: AtsExtraction = {
    jobTitle: jdLines.find(line => line.length <= 80 && TITLE.test(line)) ?? "",
    requiredSkills,
    preferredSkills: skills.filter(item => item.importance === "Preferred").map(item => item.term),
    technicalKeywords: skills.map(item => item.term),
    responsibilities: responsibilities.filter(item => item.importance !== "Preferred").map(item => item.term),
    minYearsExperience: yearsFrom(jobDescription),
    candidateYearsExperience: yearsFrom(resumeText, true),
    educationRequirements: qualifications.filter(item => item.importance !== "Preferred").map(item => item.term.replace(/\s+in\s+.*$/i, "").replace(/^bachelor'?s? degree$/, "bachelor").replace(/^master'?s? degree$/, "master")),
    candidateEducation: resumeLines.filter(line => DEGREE.test(line)),
    candidateTitles: resumeLines.filter(line => TITLE.test(line) && line.length <= 80).slice(0, 6),
    skillEvidence: skills.filter(item => evidence[item.term]).map(item => ({ term: item.term, present: true, evidence: evidence[item.term] })),
    responsibilityEvidence: responsibilities.map(item => ({ responsibility: item.term, present: Boolean(evidence[item.term]), evidence: evidence[item.term] ?? "" })),
    strengths: [], weaknesses: [], suggestions: /summary/i.test(resumeText) ? [] : ["Add a short professional summary tailored to this job title using your actual background."],
  };
  const importance = new Map(requirements.map(item => [item.term, item.importance === "Preferred" ? 0.35 : item.importance === "Required" ? 1 : 0.75]));
  // Remove explicit negative claims from matching, while retaining the original for readiness checks.
  // Negative lines cannot create literal matches in the shared scorer.
  const analysisText = resumeText.split(/\r?\n/).map(line => /\b(no experience|never used|not familiar|do not know|don't know|without experience)\b/i.test(line) ? line.replace(/[a-zA-Z][a-zA-Z0-9.+#-]*/g, " ") : line).join("\n");
  const scored = computeAtsScores(analysisText, jobDescription, extraction, undefined, importance);
  const readiness = computeAtsScores(resumeText, jobDescription, extraction);
  const supplementary = requirements.filter(item => item.category === "Job responsibilities" || item.category === "Required qualifications");
  const missingSupplementary = supplementary.filter(item => !evidence[item.term]);
  return {
    ...scored, atsScore: readiness.atsScore, breakdown: readiness.breakdown,
    recommendations: [...new Set([...scored.recommendations, ...readiness.recommendations])].slice(0, 8),
    matchedKeywords: [...scored.matchedKeywords, ...supplementary.filter(item => evidence[item.term]).map(item => item.term)],
    missingKeywords: [...scored.missingKeywords, ...missingSupplementary.map(item => item.term)],
    missingRequiredKeywords: [...scored.missingRequiredKeywords, ...missingSupplementary.filter(item => item.importance !== "Preferred").map(item => item.term)],
    missingPreferredKeywords: [...scored.missingPreferredKeywords, ...missingSupplementary.filter(item => item.importance === "Preferred").map(item => item.term)],
    keywordsChecked: requirements.length, wordCount: resumeText.trim().split(/\s+/).filter(Boolean).length,
    evidence, requirements, ignoredPhrases,
  };
}
