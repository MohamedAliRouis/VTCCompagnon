import { create } from 'zustand';
import { StatsJour, HistoriqueJour } from '../types';
import { 
  chargerStatsJour, 
  chargerHistorique, 
  ajouterHistorique,
  sauvegarder 
} from '../utils/storage';
import { CLES_STOCKAGE } from '../constants';
import { getDateJour } from '../utils/formatters';

interface StatsState {
  // État
  statsJour: StatsJour;
  historique: HistoriqueJour[];
  chargement: boolean;
  
  // Actions
  chargerStats: () => Promise<void>;
  terminerCourse: (tempsEcoule: number, revenu: number) => Promise<void>;
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
  historique: [],
  chargement: true,

  chargerStats: async () => {
    set({ chargement: true });
    
    const stats = await chargerStatsJour();
    const historique = await chargerHistorique();
    
    set({ 
      statsJour: stats, 
      historique,
      chargement: false 
    });
  },

  terminerCourse: async (tempsEcoule: number, revenu: number) => {
    const { statsJour } = get();
    const nouvellesStats: StatsJour = {
      ...statsJour,
      nbCourses: statsJour.nbCourses + 1,
      tempsTotal: statsJour.tempsTotal + tempsEcoule,
      revenuTotal: statsJour.revenuTotal + revenu,
    };
    
    set({ statsJour: nouvellesStats });
    await sauvegarder(CLES_STOCKAGE.STATS_JOUR, nouvellesStats);
    
    // Mettre à jour l'historique
    await ajouterHistorique(nouvellesStats);
    const nouvelHistorique = await chargerHistorique();
    set({ historique: nouvelHistorique });
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
