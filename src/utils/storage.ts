interface Config {
  apiKey: string;
}

const CONFIG_KEY = 'moonshot_config';

export function saveConfig(config: Config): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function getConfig(): Config | null {
  const stored = localStorage.getItem(CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}