import { create } from 'zustand';
import { Settings, Tarifs } from '../types';
import { TARIFS_DEFAUT } from '../constants';
import { chargerSettings, sauvegarderSettings } from '../utils/storage';

interface SettingsState {
  settings: Settings;
  chargement: boolean;
  
  // Actions
  chargerSettings: () => Promise<void>;
  setTarifs: (tarifs: Tarifs) => Promise<void>;
  setTheme: (theme: 'dark' | 'light') => Promise<void>;
  setNotifications: (actives: boolean) => Promise<void>;
}

const settingsInitiaux: Settings = {
  tarifs: TARIFS_DEFAUT,
  theme: 'dark',
  notifications: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: settingsInitiaux,
  chargement: true,

  chargerSettings: async () => {
    set({ chargement: true });
    const settings = await chargerSettings();
    set({ settings, chargement: false });
  },

  setTarifs: async (tarifs: Tarifs) => {
    const { settings } = get();
    const nouveauxSettings = { ...settings, tarifs };
    set({ settings: nouveauxSettings });
    await sauvegarderSettings(nouveauxSettings);
  },

  setTheme: async (theme: 'dark' | 'light') => {
    const { settings } = get();
    const nouveauxSettings = { ...settings, theme };
    set({ settings: nouveauxSettings });
    await sauvegarderSettings(nouveauxSettings);
  },

  setNotifications: async (actives: boolean) => {
    const { settings } = get();
    const nouveauxSettings = { ...settings, notifications: actives };
    set({ settings: nouveauxSettings });
    await sauvegarderSettings(nouveauxSettings);
  },
}));
