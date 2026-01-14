import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface ApiSettings {
  backendUrl: string;
  apiKey: string;
  voiceUrl: string;
  voiceModel: string;
}

const DEFAULT_SETTINGS: ApiSettings = {
  backendUrl: process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  apiKey: process.env.API_KEY || '',
  voiceUrl: process.env.VOICE_URL || process.env.NEXT_PUBLIC_VOICE_URL || '',
  voiceModel: process.env.VOICE_MODEL || process.env.NEXT_PUBLIC_VOICE_MODEL || 'whisper-1',
};

// Settings file path - relative to frontend directory
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'api-settings.json');

export async function getApiSettings(): Promise<ApiSettings> {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const content = await readFile(SETTINGS_FILE, 'utf-8');
      const saved = JSON.parse(content) as Partial<ApiSettings>;
      // Merge with defaults (env vars still take precedence if settings file has empty values)
      return {
        backendUrl: saved.backendUrl || DEFAULT_SETTINGS.backendUrl,
        apiKey: saved.apiKey || DEFAULT_SETTINGS.apiKey,
        voiceUrl: saved.voiceUrl || DEFAULT_SETTINGS.voiceUrl,
        voiceModel: saved.voiceModel || DEFAULT_SETTINGS.voiceModel,
      };
    }
  } catch (error) {
    console.error('[API Settings] Failed to read settings file:', error);
  }
  return DEFAULT_SETTINGS;
}

export async function saveApiSettings(settings: ApiSettings): Promise<void> {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true });
    }
    await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('[API Settings] Failed to save settings file:', error);
    throw error;
  }
}

// Mask API key for display (show first 4 and last 4 chars)
export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return key ? '••••••••' : '';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}
