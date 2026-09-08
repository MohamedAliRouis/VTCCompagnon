// Types pour VTC Compagnon

export type EtatCourse = 'REPOS' | 'PICKUP' | 'EN_COURSE';

export interface Course {
  id: string;
  etat: EtatCourse;
  tempsDebut: number | null;
  tempsEcoule: number;
  revenuEstime: number;
  dateCreation: string; // ISO string
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

export interface Tarifs {
  priseEnCharge: number;
  parMinute: number;
  parKm: number;
}

export interface Settings {
  tarifs: Tarifs;
  theme: 'dark' | 'light';
  notifications: boolean;
}
