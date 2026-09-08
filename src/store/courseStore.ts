import { create } from 'zustand';
import { EtatCourse, Course, Tarifs } from '../types';
import { TARIFS_DEFAUT } from '../constants';
import { chargerCourseEnCours, sauvegarderCourseEnCours } from '../utils/storage';
import { genererId, getDateJour } from '../utils/formatters';

interface CourseState {
  // État
  course: Course;
  tarifs: Tarifs;
  
  // Actions
  demarrerCourse: () => void;
  clientMonte: () => void;
  arriveeDestination: () => void;
  terminerCourse: () => void;
  annulerCourse: () => void;
  nouvelleCourse: () => void;
  majTemps: (tempsEcoule: number) => void;
  setTarifs: (tarifs: Tarifs) => void;
  chargerDepuisStockage: () => Promise<void>;
}

const courseInitiale: Course = {
  id: '',
  etat: 'REPOS',
  tempsDebut: null,
  tempsEcoule: 0,
  revenuEstime: 0,
  dateCreation: getDateJour(),
};

export const useCourseStore = create<CourseState>((set, get) => ({
  course: courseInitiale,
  tarifs: TARIFS_DEFAUT,

  demarrerCourse: () => {
    const nouvelleCourse: Course = {
      id: genererId(),
      etat: 'PICKUP',
      tempsDebut: Date.now(),
      tempsEcoule: 0,
      revenuEstime: 0,
      dateCreation: getDateJour(),
    };
    set({ course: nouvelleCourse });
    sauvegarderCourseEnCours(nouvelleCourse);
  },

  clientMonte: () => {
    const { course } = get();
    if (course.etat === 'PICKUP') {
      const maj = { ...course, etat: 'EN_COURSE' as EtatCourse };
      set({ course: maj });
      sauvegarderCourseEnCours(maj);
    }
  },

  arriveeDestination: () => {
    // Termine directement la course (plus d'état RETOUR)
    set({ course: courseInitiale });
    sauvegarderCourseEnCours(courseInitiale);
  },

  terminerCourse: () => {
    // Alias pour arriveeDestination
    set({ course: courseInitiale });
    sauvegarderCourseEnCours(courseInitiale);
  },

  annulerCourse: () => {
    set({ course: courseInitiale });
    sauvegarderCourseEnCours(courseInitiale);
  },

  nouvelleCourse: () => {
    const { demarrerCourse } = get();
    demarrerCourse();
  },

  majTemps: (tempsEcoule: number) => {
    const { course, tarifs } = get();
    const minutes = tempsEcoule / 60;
    const revenu = tarifs.priseEnCharge + (minutes * tarifs.parMinute);
    
    const maj = {
      ...course,
      tempsEcoule,
      revenuEstime: revenu,
    };
    set({ course: maj });
    sauvegarderCourseEnCours(maj);
  },

  setTarifs: (tarifs: Tarifs) => {
    set({ tarifs });
  },

  chargerDepuisStockage: async () => {
    const courseStockee = await chargerCourseEnCours();
    if (courseStockee && courseStockee.etat !== 'REPOS' && courseStockee.tempsDebut) {
      // Recalculer le temps écoulé
      const tempsEcoule = Math.floor((Date.now() - courseStockee.tempsDebut) / 1000);
      const { tarifs } = get();
      const minutes = tempsEcoule / 60;
      const revenu = tarifs.priseEnCharge + (minutes * tarifs.parMinute);
      
      set({
        course: {
          ...courseStockee,
          tempsEcoule,
          revenuEstime: revenu,
        },
      });
    }
  },
}));
