import { create } from 'zustand';
import { Settings, Tarifs, DebutSemaine } from '../types';
import { TARIFS_DEFAUT } from '../constants';
import { chargerSettings, sauvegarderSettings } from '../utils/storage';

interface SettingsState {
  settings: Settings;
  chargement: boolean;

  chargerSettings: () => Promise<void>;
  setTarifs: (tarifs: Tarifs) => Promise<void>;
  setObjectifJournalier: (objectif: number | null) => Promise<void>;
  setRetentionJours: (jours: number) => Promise<void>;
  setDebutSemaine: (debut: DebutSemaine) => Promise<void>;
}

const settingsInitiaux: Settings = {
  tarifs: TARIFS_DEFAUT,
};

export const useSettingsStore = create<SettingsState>((set, get) => {
  const patch = async (partiel: Partial<Settings>) => {
    const nouveaux = { ...get().settings, ...partiel };
    set({ settings: nouveaux });
    await sauvegarderSettings(nouveaux);
  };

  return {
    settings: settingsInitiaux,
    chargement: true,

    chargerSettings: async () => {
      set({ chargement: true });
      const settings = await chargerSettings();
      set({ settings, chargement: false });
    },

    setTarifs: tarifs => patch({ tarifs }),

    setObjectifJournalier: async objectif => {
      const nouveaux: Settings = { ...get().settings };
      if (objectif && objectif > 0) {
        nouveaux.objectifJournalier = objectif;
      } else {
        delete nouveaux.objectifJournalier;
      }
      set({ settings: nouveaux });
      await sauvegarderSettings(nouveaux);
    },

    setRetentionJours: jours => patch({ retentionJours: jours }),

    setDebutSemaine: debut => patch({ debutSemaine: debut }),
  };
});
