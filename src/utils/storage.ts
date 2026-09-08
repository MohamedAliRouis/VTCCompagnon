import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLES_STOCKAGE } from '../constants';
import {
  StatsJour,
  HistoriqueJour,
  Settings,
  Course,
  SessionTravail,
  CourseHistorique,
  SessionHistorique,
} from '../types';
import { TARIFS_DEFAUT } from '../constants';
import { getDateJour } from './formatters';

// Charger une valeur
export const charger = async <T>(cle: string): Promise<T | null> => {
  try {
    const valeur = await AsyncStorage.getItem(cle);
    return valeur ? JSON.parse(valeur) : null;
  } catch (error) {
    console.error(`Erreur chargement ${cle}:`, error);
    return null;
  }
};

// Sauvegarder une valeur
export const sauvegarder = async <T>(cle: string, valeur: T): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(cle, JSON.stringify(valeur));
    return true;
  } catch (error) {
    console.error(`Erreur sauvegarde ${cle}:`, error);
    return false;
  }
};

// Charger les stats du jour (avec reset si nouveau jour)
export const chargerStatsJour = async (): Promise<StatsJour> => {
  const dateJour = getDateJour();
  const dateStockee = await charger<string>(CLES_STOCKAGE.DATE_DERNIER_RESET);
  
  if (dateStockee !== dateJour) {
    // Nouveau jour : reset
    const statsVides: StatsJour = {
      nbCourses: 0,
      tempsTotal: 0,
      revenuTotal: 0,
      date: dateJour,
    };
    await sauvegarder(CLES_STOCKAGE.STATS_JOUR, statsVides);
    await sauvegarder(CLES_STOCKAGE.DATE_DERNIER_RESET, dateJour);
    return statsVides;
  }
  
  const stats = await charger<StatsJour>(CLES_STOCKAGE.STATS_JOUR);
  return stats || {
    nbCourses: 0,
    tempsTotal: 0,
    revenuTotal: 0,
    date: dateJour,
  };
};

// Ancien agrégat journalier (@vtc_historique) : conservé en lecture seule comme
// fallback pour les données créées avant le journal détaillé. Plus jamais écrit.
export const chargerHistorique = async (): Promise<HistoriqueJour[]> => {
  const historique = await charger<HistoriqueJour[]>(CLES_STOCKAGE.HISTORIQUE);
  return historique || [];
};

// Date (YYYY-MM-DD) à partir de laquelle le journal détaillé est alimenté.
export const chargerLogDepuis = async (): Promise<string | null> => {
  return charger<string>(CLES_STOCKAGE.LOG_DEPUIS);
};

export const sauvegarderLogDepuis = async (date: string): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.LOG_DEPUIS, date);
};

// Journal des courses terminées
export const chargerCoursesHistorique = async (): Promise<CourseHistorique[]> => {
  return (
    (await charger<CourseHistorique[]>(CLES_STOCKAGE.COURSES_HISTORIQUE)) || []
  );
};

export const sauvegarderCoursesHistorique = async (
  courses: CourseHistorique[],
): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.COURSES_HISTORIQUE, courses);
};

// Journal des services terminés
export const chargerSessionsHistorique = async (): Promise<
  SessionHistorique[]
> => {
  return (
    (await charger<SessionHistorique[]>(CLES_STOCKAGE.SESSIONS_HISTORIQUE)) || []
  );
};

export const sauvegarderSessionsHistorique = async (
  sessions: SessionHistorique[],
): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.SESSIONS_HISTORIQUE, sessions);
};

// Charger la course en cours
export const chargerCourseEnCours = async (): Promise<Course | null> => {
  return charger<Course>(CLES_STOCKAGE.COURSE_EN_COURS);
};

// Sauvegarder la course en cours
export const sauvegarderCourseEnCours = async (course: Course): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.COURSE_EN_COURS, course);
};

export const chargerSessionTravail = async (): Promise<SessionTravail | null> => {
  return charger<SessionTravail>(CLES_STOCKAGE.SESSION_TRAVAIL);
};

export const sauvegarderSessionTravail = async (
  session: SessionTravail,
): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.SESSION_TRAVAIL, session);
};

// Charger les settings
export const chargerSettings = async (): Promise<Settings> => {
  const settings = await charger<Settings>(CLES_STOCKAGE.SETTINGS);
  return settings || {
    tarifs: TARIFS_DEFAUT,
    notifications: true,
  };
};

// Sauvegarder les settings
export const sauvegarderSettings = async (settings: Settings): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.SETTINGS, settings);
};
