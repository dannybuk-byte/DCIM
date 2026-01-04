import { deleteSetting, getSettings, saveSettings, settingsKey } from '../utils/settingsPersistence';

export type OrganizerDataSensitivity = 'low' | 'medium' | 'high';

export interface OrganizerProfile {
  organization?: string;
  role?: string;
  region?: string;
  campaigns?: string;
  targetCompanies?: string;
  preferredOutputs?: string;
  tone?: 'direct' | 'strategic' | 'narrative';
  dataSensitivity: OrganizerDataSensitivity;
  shareWithExternalAI: boolean;
  updatedAt: string;
}

const ORGANIZER_PROFILE_KEY = settingsKey('organizerProfile');

const DEFAULT_PROFILE: OrganizerProfile = {
  dataSensitivity: 'high',
  shareWithExternalAI: false,
  tone: 'strategic',
  updatedAt: new Date().toISOString(),
};

let cache: { value: OrganizerProfile | null; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getOrganizerProfile(): Promise<OrganizerProfile | null> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.value;
  const stored = await getSettings<OrganizerProfile>(ORGANIZER_PROFILE_KEY);
  cache = { value: stored, loadedAt: Date.now() };
  return stored;
}

export async function saveOrganizerProfile(
  profile: Omit<OrganizerProfile, 'updatedAt'> & Partial<Pick<OrganizerProfile, 'updatedAt'>>
): Promise<void> {
  const value: OrganizerProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  await saveSettings(ORGANIZER_PROFILE_KEY, value);
  cache = { value, loadedAt: Date.now() };
}

export async function resetOrganizerProfile(): Promise<void> {
  await deleteSetting(ORGANIZER_PROFILE_KEY);
  cache = { value: null, loadedAt: Date.now() };
}

export function formatOrganizerProfileForAI(profile: OrganizerProfile): string {
  const lines: string[] = [];

  if (profile.organization) lines.push(`Organization: ${profile.organization}`);
  if (profile.role) lines.push(`Role: ${profile.role}`);
  if (profile.region) lines.push(`Region: ${profile.region}`);
  if (profile.campaigns) lines.push(`Campaigns: ${profile.campaigns}`);
  if (profile.targetCompanies) lines.push(`Targets: ${profile.targetCompanies}`);
  if (profile.preferredOutputs) lines.push(`Preferred outputs: ${profile.preferredOutputs}`);
  if (profile.tone) lines.push(`Tone: ${profile.tone}`);
  lines.push(`Data sensitivity: ${profile.dataSensitivity}`);

  return `Organizer Profile (local, user-provided):\n${lines.map(l => `- ${l}`).join('\n')}`;
}


