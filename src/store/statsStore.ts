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
  // Renvoie l'id de la ligne créée dans le journal (pour une éventuelle annulation).
  terminerCourse: (params: {
    tempsEcoule: number;
    revenu: number;
    debut: number;
  }) => Promise<string>;
  retirerCourse: (params: {
    tempsEcoule: number;
    revenu: number;
    date: string;
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
    return useHistoryStore
      .getState()
      .enregistrerCourse({ debut, duree: tempsEcoule, revenu });
  },

  // Défait terminerCourse : utilisé par la fenêtre d'annulation après ARRIVÉE.
  retirerCourse: async ({ tempsEcoule, revenu, date }) => {
    const { statsJour } = get();
    if (statsJour.date !== date) {
      // Minuit est passé depuis : les compteurs du jour ne contiennent plus
      // cette course, il n'y a rien à décrémenter.
      return;
    }

    const maj: StatsJour = {
      date: statsJour.date,
      nbCourses: Math.max(0, statsJour.nbCourses - 1),
      tempsTotal: Math.max(0, statsJour.tempsTotal - tempsEcoule),
      revenuTotal: Math.max(0, statsJour.revenuTotal - revenu),
    };

    set({ statsJour: maj });
    await sauvegarder(CLES_STOCKAGE.STATS_JOUR, maj);
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
