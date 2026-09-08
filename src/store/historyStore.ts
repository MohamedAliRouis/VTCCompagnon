import { create } from 'zustand';
import { CourseHistorique, SessionHistorique, HistoriqueJour } from '../types';
import { CLES_STOCKAGE, RETENTION_JOURS } from '../constants';
import {
  chargerCoursesHistorique,
  sauvegarderCoursesHistorique,
  chargerSessionsHistorique,
  sauvegarderSessionsHistorique,
  chargerHistorique,
  chargerLogDepuis,
  sauvegarderLogDepuis,
  supprimer,
} from '../utils/storage';
import { getDateJour, genererId } from '../utils/formatters';
import { ajouterJours } from '../utils/historique';
import { useSettingsStore } from './settingsStore';

interface HistoryState {
  courses: CourseHistorique[];
  sessions: SessionHistorique[];
  agregatsLegacy: HistoriqueJour[]; // ancien @vtc_historique, fallback lecture seule
  logDepuis: string; // date de bascule vers le journal détaillé (YYYY-MM-DD)
  chargement: boolean;

  chargerHistorique: () => Promise<void>;
  // Renvoie l'id de la ligne créée, pour pouvoir la retirer si l'utilisateur
  // annule dans la foulée.
  enregistrerCourse: (c: {
    debut: number;
    duree: number;
    revenu: number;
  }) => Promise<string>;
  supprimerCourse: (id: string) => Promise<void>;
  enregistrerSession: (s: {
    debut: number;
    fin: number;
    tempsService: number;
    tempsPause: number;
  }) => Promise<void>;
  effacer: () => Promise<void>;
}

// Ne garde que les lignes dans la fenêtre de rétention configurée.
const purger = <T extends { date: string }>(rows: T[]): T[] => {
  const jours =
    useSettingsStore.getState().settings.retentionJours ?? RETENTION_JOURS;
  const limite = ajouterJours(getDateJour(), -jours);
  return rows.filter(r => r.date >= limite);
};

// Fixe la date de bascule au premier appel (idempotent).
const assurerLogDepuis = async (actuel: string): Promise<string> => {
  if (actuel) {
    return actuel;
  }
  const date = getDateJour();
  await sauvegarderLogDepuis(date);
  return date;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  courses: [],
  sessions: [],
  agregatsLegacy: [],
  logDepuis: '',
  chargement: true,

  chargerHistorique: async () => {
    const [courses, sessions, agregatsLegacy, logDepuisStocke] =
      await Promise.all([
        chargerCoursesHistorique(),
        chargerSessionsHistorique(),
        chargerHistorique(),
        chargerLogDepuis(),
      ]);
    const logDepuis = await assurerLogDepuis(logDepuisStocke ?? '');
    set({ courses, sessions, agregatsLegacy, logDepuis, chargement: false });
  },

  enregistrerCourse: async ({ debut, duree, revenu }) => {
    const logDepuis = await assurerLogDepuis(get().logDepuis);
    const ligne: CourseHistorique = {
      id: genererId(),
      date: getDateJour(),
      debut,
      duree,
      revenu,
    };
    const courses = purger([...get().courses, ligne]);
    set({ courses, logDepuis });
    await sauvegarderCoursesHistorique(courses);
    return ligne.id;
  },

  supprimerCourse: async (id: string) => {
    const courses = get().courses.filter(c => c.id !== id);
    set({ courses });
    await sauvegarderCoursesHistorique(courses);
  },

  enregistrerSession: async ({ debut, fin, tempsService, tempsPause }) => {
    const logDepuis = await assurerLogDepuis(get().logDepuis);
    const ligne: SessionHistorique = {
      id: genererId(),
      date: getDateJour(),
      debut,
      fin,
      tempsService,
      tempsPause,
    };
    const sessions = purger([...get().sessions, ligne]);
    set({ sessions, logDepuis });
    await sauvegarderSessionsHistorique(sessions);
  },

  // Vide tout le journal (courses, sessions, legacy). Les réglages sont conservés.
  // logDepuis repart d'aujourd'hui pour que la fusion legacy reste cohérente.
  effacer: async () => {
    const logDepuis = getDateJour();
    set({ courses: [], sessions: [], agregatsLegacy: [], logDepuis });
    await Promise.all([
      sauvegarderCoursesHistorique([]),
      sauvegarderSessionsHistorique([]),
      supprimer(CLES_STOCKAGE.HISTORIQUE),
      sauvegarderLogDepuis(logDepuis),
    ]);
  },
}));
