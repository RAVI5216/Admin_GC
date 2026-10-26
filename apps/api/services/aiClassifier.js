/**
 * AI Report Classifier Service
 * Provides automated NLP report categorization, severity assessment,
 * department routing, and actionable resolution recommendations.
 * Uses Gemini API if GEMINI_API_KEY is configured, with a high-accuracy
 * local NLP rule-engine fallback.
 */

const CATEGORY_RULES = [
  {
    category: 'Hazardous Waste',
    keywords: ['chemical', 'toxic', 'acid', 'poison', 'medical', 'syringe', 'needle', 'battery', 'oil', 'flammable', 'asbestos', 'hazardous'],
    severity: 'critical',
    department: 'Hazardous Materials Unit',
    action: 'Deploy hazmat specialists for safe containment and disposal',
    baseConfidence: 0.95,
  },
  {
    category: 'Vandalism & Fire Hazard',
    keywords: ['fire', 'smoke', 'burning', 'burnt', 'flame', 'spark', 'exploded', 'vandalized', 'smashed', 'tipped over', 'knocked over', 'stolen'],
    severity: 'critical',
    department: 'Emergency & Maintenance Operations',
    action: 'Dispatch emergency team to secure location and inspect hardware',
    baseConfidence: 0.96,
  },
  {
    category: 'Dead Animal / Biohazard',
    keywords: ['dead animal', 'carcass', 'decay', 'maggot', 'rotting', 'dead dog', 'dead cat', 'dead bird', 'flesh', 'bloody'],
    severity: 'high',
    department: 'Sanitation & Animal Control',
    action: 'Immediate sanitized retrieval and area disinfection',
    baseConfidence: 0.93,
  },
  {
    category: 'Overflowing Bin',
    keywords: ['overflowing', 'overflow', 'spilling', 'full', 'spillover', 'heaping', 'piled up', 'trash outside', 'garbage everywhere', 'dumped near'],
    severity: 'high',
    department: 'Waste Collection',
    action: 'Priority dispatch to empty the bin and clear perimeter litter',
    baseConfidence: 0.94,
  },
  {
    category: 'Odor & Pest Infestation',
    keywords: ['smell', 'stink', 'stinking', 'odor', 'foul', 'flies', 'mosquitoes', 'rats', 'infestation', 'dirty', 'unhygienic'],
    severity: 'medium',
    department: 'Sanitation & Pest Control',
    action: 'Deep clean, wash bin interior, and apply pest deterrent spray',
    baseConfidence: 0.89,
  },
  {
    category: 'Illegal Dumping',
    keywords: ['dumping', 'furniture', 'mattress', 'construction', 'debris', 'concrete', 'commercial waste', 'unauthorized dumping', 'tires'],
    severity: 'medium',
    department: 'Municipal Enforcement & Heavy Haul',
    action: 'Deploy flatbed collection vehicle and log violation details',
    baseConfidence: 0.91,
  },
  {
    category: 'Damaged Hardware',
    keywords: ['broken', 'hinge', 'lid', 'sensor', 'cracked', 'wheel', 'lock', 'damaged', 'rusted'],
    severity: 'low',
    department: 'Hardware Maintenance',
    action: 'Schedule bin repair or replacement on next maintenance cycle',
    baseConfidence: 0.88,
  },
];

const EXTRACT_LOCATION_PATTERNS = [
  /(?:near|at|by|beside|opposite|behind|front of|around|outside)\s+([A-Z0-9a-z\s]{3,35})(?:[,\.]|$)/i,
  /(?:gate|building|wing|block|park|street|road|hall|canteen|lake|ground|hostel|campus)\s*([0-9A-Za-z\-]+)?/i,
];

export async function classifyReportWithGemini(text, locationHint = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const prompt = `You are an AI waste management operations assistant. Analyze this citizen/operator waste report:
Text: "${text}"
Location hint: "${locationHint}"

Return ONLY a valid JSON object with these keys:
{
  "category": "Overflowing Bin" | "Hazardous Waste" | "Vandalism & Fire Hazard" | "Dead Animal / Biohazard" | "Odor & Pest Infestation" | "Illegal Dumping" | "Damaged Hardware" | "General Waste Issue",
  "severity": "critical" | "high" | "medium" | "low",
  "suggestedAction": "concise recommended operational action",
  "suggestedDepartment": "Waste Collection" | "Hazardous Materials Unit" | "Sanitation & Pest Control" | "Hardware Maintenance" | "Emergency & Maintenance Operations" | "Municipal Enforcement",
  "confidence": number between 0.70 and 0.99,
  "summary": "1 sentence brief operational assessment",
  "extractedLocation": "extracted landmark or street name if mentioned"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;
    return JSON.parse(candidateText);
  } catch {
    return null;
  }
}

export function classifyReportLocally(text = '', locationHint = '') {
  const normalized = (text + ' ' + locationHint).toLowerCase().trim();

  // Find matching rule with highest keyword matches
  let bestMatch = null;
  let maxMatches = 0;

  for (const rule of CATEGORY_RULES) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        matchCount++;
      }
    }
    if (matchCount > maxMatches) {
      maxMatches = matchCount;
      bestMatch = rule;
    }
  }

  // Location extraction
  let extractedLocation = locationHint || null;
  if (!extractedLocation) {
    for (const pattern of EXTRACT_LOCATION_PATTERNS) {
      const match = text.match(pattern);
      if (match?.[1]) {
        extractedLocation = match[1].trim();
        break;
      }
    }
  }

  // If no specific match, provide intelligent default
  if (!bestMatch || maxMatches === 0) {
    return {
      category: 'General Waste Issue',
      severity: 'medium',
      suggestedAction: 'Inspect location and assign standard waste pickup',
      suggestedDepartment: 'Waste Collection',
      confidence: 0.85,
      summary: 'Report requires physical inspection by waste team.',
      extractedLocation,
      source: 'rule-engine',
    };
  }

  const confidence = Math.min(0.98, bestMatch.baseConfidence + (maxMatches - 1) * 0.02);

  return {
    category: bestMatch.category,
    severity: bestMatch.severity,
    suggestedAction: bestMatch.action,
    suggestedDepartment: bestMatch.department,
    confidence: Number(confidence.toFixed(2)),
    summary: `${bestMatch.category} reported at ${extractedLocation || 'specified location'}; action recommended: ${bestMatch.action}.`,
    extractedLocation,
    source: 'rule-engine',
  };
}

const PYTHON_ML_SERVICE_URL = process.env.PYTHON_ML_SERVICE_URL || 'http://127.0.0.1:5001';

/**
 * Call the Python scikit-learn ML microservice
 */
export async function classifyWithPythonML(text, locationHint = '') {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${PYTHON_ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, location: locationHint }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch trained model evaluation metrics from Python ML service
 */
export async function getPythonMLMetrics() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${PYTHON_ML_SERVICE_URL}/metrics`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Main classification entrypoint:
 * Priority: 1. Python scikit-learn ML model -> 2. Gemini API -> 3. Local NLP Engine
 */
export async function classifyReport(text, location = '') {
  // 1. Try Python Scikit-Learn ML service first
  const pythonMlResult = await classifyWithPythonML(text, location);
  if (pythonMlResult) {
    return pythonMlResult;
  }

  // 2. Try Gemini API if configured
  const geminiResult = await classifyReportWithGemini(text, location);
  if (geminiResult) {
    return { ...geminiResult, source: 'gemini-1.5-flash' };
  }

  // 3. Fallback to local rule-based NLP
  return classifyReportLocally(text, location);
}
