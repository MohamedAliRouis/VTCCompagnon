import { create } from 'zustand';
import { StatsJour } from '../types';
import { chargerStatsJour, sauvegarder } from '../utils/storage';
import { CLES_STOCKAGE } from '../constants';
import { getDateJour } from '../utils/formatters';
import { useHistoryStore } from './historyStore';

interface StatsState {
  statsJour: StatsJour;
  chargement: boolean;

  chargerStats: () => Promise<void>;
  terminerCourse: (params: {
    tempsEcoule: number;
    revenu: number;
    debut: number;
  }) => Promise<void>;
  resetJour: () => Promise<void>;
}

const statsInitiales: StatsJour = {
  nbCourses: 0,
  tempsTotal: 0,
  revenuTotal: 0,
  date: getDateJour(),
};

export const useStatsStore = create<StatsState>((set, get) => ({
  statsJour: statsInitiales,
  chargement: true,

  chargerStats: async () => {
    set({ chargement: true });
    const stats = await chargerStatsJour();
    set({ statsJour: stats, chargement: false });
  },

  terminerCourse: async ({ tempsEcoule, revenu, debut }) => {
    const dateJour = getDateJour();
    const { statsJour } = get();

    // Si la session a franchi minuit (chauffeur de nuit), on repart d'une
    // journée vierge au lieu d'empiler sur la veille.
    const base =
      statsJour.date === dateJour
        ? statsJour
        : { nbCourses: 0, tempsTotal: 0, revenuTotal: 0, date: dateJour };

    const nouvellesStats: StatsJour = {
      date: dateJour,
      nbCourses: base.nbCourses + 1,
      tempsTotal: base.tempsTotal + tempsEcoule,
      revenuTotal: base.revenuTotal + revenu,
    };

    set({ statsJour: nouvellesStats });
    await sauvegarder(CLES_STOCKAGE.STATS_JOUR, nouvellesStats);
    await sauvegarder(CLES_STOCKAGE.DATE_DERNIER_RESET, dateJour);

    // Journal détaillé (source de vérité de l'historique).
    await useHistoryStore
      .getState()
      .enregistrerCourse({ debut, duree: tempsEcoule, revenu });
  },

  resetJour: async () => {
    const dateJour = getDateJour();
    const statsVides: StatsJour = {
      nbCourses: 0,
      tempsTotal: 0,
      revenuTotal: 0,
      date: dateJour,
    };

    set({ statsJour: statsVides });
    await sauvegarder(CLES_STOCKAGE.STATS_JOUR, statsVides);
    await sauvegarder(CLES_STOCKAGE.DATE_DERNIER_RESET, dateJour);
  },
}));
