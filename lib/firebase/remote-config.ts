import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!serviceAccount || !projectId) {
    console.warn(
      "⚠️  Firebase credentials not configured. Remote Config will use default values."
    );
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
}

// Default configuration values
const DEFAULT_CONFIG = {
  agent_system_instructions:
    "You are ReviewGPT, a senior product manager AI assistant specializing in app review analysis. " +
    "Analyze the provided app reviews and extract actionable insights. " +
    "Focus on identifying:\n" +
    "- **Technical bugs**: Specific issues users are experiencing\n" +
    "- **UX problems**: Interface and usability complaints\n" +
    "- **Feature requests**: What users want added or improved\n" +
    "- **Sentiment trends**: Overall user satisfaction patterns\n\n" +
    "Be concise, data-driven, and provide bulleted summaries. " +
    "Always cite specific reviews when making claims.",
  preferred_model: "gemini-1.5-pro",
  embedding_provider: "google",
  max_context_reviews: "10",
  sync_interval_hours: "24",
  max_reviews_per_sync: "100",
};

interface RemoteConfigValues {
  agent_system_instructions: string;
  preferred_model: "gemini-1.5-pro" | "gemini-1.5-flash" | "gpt-4o" | "gpt-4o-mini";
  embedding_provider: "google" | "openai";
  max_context_reviews: number;
  sync_interval_hours: number;
  max_reviews_per_sync: number;
}

// Cache for Remote Config values
let configCache: RemoteConfigValues | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch Remote Config values from Firebase
 * Uses caching to avoid excessive API calls
 */
export async function getRemoteConfig(): Promise<RemoteConfigValues> {
  const now = Date.now();

  // Return cached config if still valid
  if (configCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return configCache;
  }

  // Try to fetch from Firebase
  try {
    if (!admin.apps.length) {
      // Firebase not initialized, use defaults
      return parseConfigValues(DEFAULT_CONFIG);
    }

    const remoteConfig = admin.remoteConfig();
    const template = await remoteConfig.getTemplate();

    const values: Record<string, string> = {};

    // Extract parameter values from template
    for (const [key, parameter] of Object.entries(template.parameters)) {
      if (parameter.defaultValue && "value" in parameter.defaultValue) {
        values[key] = parameter.defaultValue.value as string;
      }
    }

    // Merge with defaults for any missing values
    const merged = { ...DEFAULT_CONFIG, ...values };
    const parsed = parseConfigValues(merged);

    // Update cache
    configCache = parsed;
    cacheTimestamp = now;

    console.log("✓ Remote Config fetched from Firebase");
    return parsed;
  } catch (error) {
    console.error("Failed to fetch Remote Config from Firebase:", error);
    console.log("Using default configuration values");

    // On error, use defaults
    return parseConfigValues(DEFAULT_CONFIG);
  }
}

/**
 * Parse and validate config values
 */
function parseConfigValues(raw: Record<string, string>): RemoteConfigValues {
  return {
    agent_system_instructions: raw.agent_system_instructions || DEFAULT_CONFIG.agent_system_instructions,
    preferred_model: (raw.preferred_model || DEFAULT_CONFIG.preferred_model) as RemoteConfigValues["preferred_model"],
    embedding_provider: (raw.embedding_provider || DEFAULT_CONFIG.embedding_provider) as RemoteConfigValues["embedding_provider"],
    max_context_reviews: parseInt(raw.max_context_reviews || DEFAULT_CONFIG.max_context_reviews),
    sync_interval_hours: parseInt(raw.sync_interval_hours || DEFAULT_CONFIG.sync_interval_hours),
    max_reviews_per_sync: parseInt(raw.max_reviews_per_sync || DEFAULT_CONFIG.max_reviews_per_sync),
  };
}

/**
 * Manually refresh the config cache (useful for testing)
 */
export async function refreshConfig(): Promise<RemoteConfigValues> {
  configCache = null;
  cacheTimestamp = 0;
  return await getRemoteConfig();
}

/**
 * Get a specific config value
 */
export async function getConfigValue<K extends keyof RemoteConfigValues>(
  key: K
): Promise<RemoteConfigValues[K]> {
  const config = await getRemoteConfig();
  return config[key];
}
