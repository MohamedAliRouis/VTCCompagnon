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
  setNotifications: (actives: boolean) => Promise<void>;
  setObjectifJournalier: (objectif: number | null) => Promise<void>;
}

const settingsInitiaux: Settings = {
  tarifs: TARIFS_DEFAUT,
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

  setNotifications: async (actives: boolean) => {
    const { settings } = get();
    const nouveauxSettings = { ...settings, notifications: actives };
    set({ settings: nouveauxSettings });
    await sauvegarderSettings(nouveauxSettings);
  },

  setObjectifJournalier: async (objectif: number | null) => {
    const { settings } = get();
    const nouveauxSettings: Settings = { ...settings };
    if (objectif && objectif > 0) {
      nouveauxSettings.objectifJournalier = objectif;
    } else {
      delete nouveauxSettings.objectifJournalier;
    }
    set({ settings: nouveauxSettings });
    await sauvegarderSettings(nouveauxSettings);
  },
}));
