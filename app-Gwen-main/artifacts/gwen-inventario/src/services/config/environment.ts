export interface RuntimeConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  predictionApiUrl: string | null;
}

function optionalEnv(value: string | undefined): string | null {
  return value?.trim() ? value.trim() : null;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    supabaseUrl: optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: optionalEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
    predictionApiUrl: optionalEnv(process.env.EXPO_PUBLIC_PREDICTION_API_URL),
  };
}

export function isSupabaseConfigured(config = getRuntimeConfig()): boolean {
  return Boolean(config.supabaseUrl && config.supabaseAnonKey);
}