import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLES_STOCKAGE } from '../constants';
import {
  StatsJour,
  HistoriqueJour,
  Settings,
  Course,
  SessionTravail,
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

// Charger l'historique (7 derniers jours max)
export const chargerHistorique = async (): Promise<HistoriqueJour[]> => {
  const historique = await charger<HistoriqueJour[]>(CLES_STOCKAGE.HISTORIQUE);
  return historique || [];
};

// Ajouter une journée à l'historique
export const ajouterHistorique = async (stats: StatsJour): Promise<void> => {
  const historique = await chargerHistorique();
  const nouvelHistorique = [
    ...historique.filter(h => h.date !== stats.date),
    {
      date: stats.date,
      nbCourses: stats.nbCourses,
      tempsTotal: stats.tempsTotal,
      revenuTotal: stats.revenuTotal,
    },
  ].slice(-7); // Garder 7 derniers jours
  
  await sauvegarder(CLES_STOCKAGE.HISTORIQUE, nouvelHistorique);
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
    theme: 'dark',
    notifications: true,
  };
};

// Sauvegarder les settings
export const sauvegarderSettings = async (settings: Settings): Promise<void> => {
  await sauvegarder(CLES_STOCKAGE.SETTINGS, settings);
};
