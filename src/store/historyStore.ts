import { create } from 'zustand';
import { CourseHistorique, SessionHistorique, HistoriqueJour } from '../types';
import { RETENTION_JOURS } from '../constants';
import {
  chargerCoursesHistorique,
  sauvegarderCoursesHistorique,
  chargerSessionsHistorique,
  sauvegarderSessionsHistorique,
  chargerHistorique,
} from '../utils/storage';
import { getDateJour, genererId } from '../utils/formatters';
import { ajouterJours } from '../utils/historique';

interface HistoryState {
  courses: CourseHistorique[];
  sessions: SessionHistorique[];
  agregatsLegacy: HistoriqueJour[]; // ancien @vtc_historique, fallback lecture seule
  chargement: boolean;

  chargerHistorique: () => Promise<void>;
  enregistrerCourse: (c: {
    debut: number;
    duree: number;
    revenu: number;
  }) => Promise<void>;
  enregistrerSession: (s: {
    debut: number;
    fin: number;
    tempsService: number;
    tempsPause: number;
  }) => Promise<void>;
}

// Ne garde que les lignes des RETENTION_JOURS derniers jours.
const purger = <T extends { date: string }>(rows: T[]): T[] => {
  const limite = ajouterJours(getDateJour(), -RETENTION_JOURS);
  return rows.filter(r => r.date >= limite);
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  courses: [],
  sessions: [],
  agregatsLegacy: [],
  chargement: true,

  chargerHistorique: async () => {
    const [courses, sessions, agregatsLegacy] = await Promise.all([
      chargerCoursesHistorique(),
      chargerSessionsHistorique(),
      chargerHistorique(),
    ]);
    set({ courses, sessions, agregatsLegacy, chargement: false });
  },

  enregistrerCourse: async ({ debut, duree, revenu }) => {
    const ligne: CourseHistorique = {
      id: genererId(),
      date: getDateJour(),
      debut,
      duree,
      revenu,
    };
    const courses = purger([...get().courses, ligne]);
    set({ courses });
    await sauvegarderCoursesHistorique(courses);
  },

  enregistrerSession: async ({ debut, fin, tempsService, tempsPause }) => {
    const ligne: SessionHistorique = {
      id: genererId(),
      date: getDateJour(),
      debut,
      fin,
      tempsService,
      tempsPause,
    };
    const sessions = purger([...get().sessions, ligne]);
    set({ sessions });
    await sauvegarderSessionsHistorique(sessions);
  },
}));
