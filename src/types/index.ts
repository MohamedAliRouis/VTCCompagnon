// Types pour VTC Compagnon

export type EtatCourse = 'REPOS' | 'PICKUP' | 'EN_COURSE';
export type EtatSession = 'HORS_SERVICE' | 'EN_SERVICE' | 'EN_PAUSE';

export interface Course {
  id: string;
  etat: EtatCourse;
  tempsDebut: number | null;
  tempsEcoule: number;
  revenuEstime: number;
  dateCreation: string; // ISO string
}

export interface SessionTravail {
  etat: EtatSession;
  tempsDebutService: number | null;
  tempsDebutPause: number | null;
  tempsServiceEcoule: number;
  tempsPauseEcoule: number;
  tempsPauseCumule: number;
  date: string;
}

export interface StatsJour {
  nbCourses: number;
  tempsTotal: number; // secondes
  revenuTotal: number;
  date: string; // YYYY-MM-DD
}

export interface HistoriqueJour {
  date: string;
  nbCourses: number;
  tempsTotal: number;
  revenuTotal: number;
}

// Journal : une ligne par course terminée.
export interface CourseHistorique {
  id: string;
  date: string; // YYYY-MM-DD local
  debut: number; // epoch ms
  duree: number; // secondes
  revenu: number;
}

// Journal : une ligne par service terminé.
export interface SessionHistorique {
  id: string;
  date: string; // YYYY-MM-DD local
  debut: number; // epoch ms
  fin: number; // epoch ms
  tempsService: number; // secondes travaillées, hors pauses
  tempsPause: number; // secondes de pause cumulées
}

export interface Tarifs {
  priseEnCharge: number;
  parMinute: number;
  parKm: number;
}

export interface Settings {
  tarifs: Tarifs;
  notifications: boolean;
  objectifJournalier?: number; // revenu cible du jour, en €
}
