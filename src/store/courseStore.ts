import { create } from 'zustand';
import { EtatCourse, Course, Tarifs, AnnulationCourse } from '../types';
import { TARIFS_DEFAUT, DUREE_ANNULATION_MS } from '../constants';
import { chargerCourseEnCours, sauvegarderCourseEnCours } from '../utils/storage';
import { genererId, getDateJour } from '../utils/formatters';
import { useHistoryStore } from './historyStore';
import { useStatsStore } from './statsStore';

interface CourseState {
  // État
  course: Course;
  tarifs: Tarifs;
  // Course tout juste terminée, encore annulable. null hors fenêtre.
  annulationEnAttente: AnnulationCourse | null;

  // Actions
  demarrerCourse: () => void;
  clientMonte: () => void;
  arriveeDestination: () => void;
  annulerCourse: () => void;
  nouvelleCourse: () => void;
  majTemps: (tempsEcoule: number) => void;
  setTarifs: (tarifs: Tarifs) => void;
  chargerDepuisStockage: () => Promise<void>;

  // Fenêtre d'annulation
  preparerAnnulation: (a: Omit<AnnulationCourse, 'expireA'>) => void;
  annulerFinDeCourse: () => Promise<void>;
  oublierAnnulation: () => void;
}

// Minuteur d'expiration. La correction ne dépend pas de lui : `expireA` est
// revérifié à l'usage, le minuteur ne sert qu'à rafraîchir l'affichage.
let minuteurAnnulation: ReturnType<typeof setTimeout> | null = null;

const stopperMinuteur = () => {
  if (minuteurAnnulation) {
    clearTimeout(minuteurAnnulation);
    minuteurAnnulation = null;
  }
};

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
  annulationEnAttente: null,

  demarrerCourse: () => {
    stopperMinuteur();
    const nouvelleCourse: Course = {
      id: genererId(),
      etat: 'PICKUP',
      tempsDebut: Date.now(),
      tempsEcoule: 0,
      revenuEstime: 0,
      dateCreation: getDateJour(),
    };
    // Démarrer une nouvelle course clôt la fenêtre d'annulation de la précédente.
    set({ course: nouvelleCourse, annulationEnAttente: null });
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
    if (course.etat === 'REPOS' || !course.tempsDebut) {
      return;
    }
    const minutes = tempsEcoule / 60;
    const revenu = tarifs.priseEnCharge + (minutes * tarifs.parMinute);

    // Pas de persistance ici : ce tick est purement dérivé de course.tempsDebut,
    // que chargerDepuisStockage recalcule au redémarrage. On ne persiste que sur
    // les transitions d'état (demarrerCourse / clientMonte / arrivee / annuler).
    set({
      course: {
        ...course,
        tempsEcoule,
        revenuEstime: revenu,
      },
    });
  },

  setTarifs: (tarifs: Tarifs) => {
    set({ tarifs });
  },

  preparerAnnulation: annulation => {
    stopperMinuteur();
    const expireA = Date.now() + DUREE_ANNULATION_MS;
    set({ annulationEnAttente: { ...annulation, expireA } });
    minuteurAnnulation = setTimeout(() => {
      minuteurAnnulation = null;
      set({ annulationEnAttente: null });
    }, DUREE_ANNULATION_MS);
  },

  oublierAnnulation: () => {
    stopperMinuteur();
    set({ annulationEnAttente: null });
  },

  // Défait une ARRIVÉE : retire la ligne du journal, décrémente les stats du
  // jour, et remet la course en cours avec son timestamp de départ d'origine.
  annulerFinDeCourse: async () => {
    const annulation = get().annulationEnAttente;
    stopperMinuteur();
    set({ annulationEnAttente: null });

    if (!annulation || Date.now() > annulation.expireA) {
      return;
    }

    await useHistoryStore.getState().supprimerCourse(annulation.idHistorique);
    await useStatsStore.getState().retirerCourse({
      tempsEcoule: annulation.duree,
      revenu: annulation.revenu,
      date: annulation.date,
    });

    const { tarifs } = get();
    const tempsEcoule = Math.max(
      0,
      Math.floor((Date.now() - annulation.tempsDebut) / 1000),
    );
    const course: Course = {
      id: genererId(),
      etat: 'EN_COURSE',
      tempsDebut: annulation.tempsDebut,
      tempsEcoule,
      revenuEstime:
        tarifs.priseEnCharge + (tempsEcoule / 60) * tarifs.parMinute,
      dateCreation: getDateJour(),
    };
    set({ course });
    sauvegarderCourseEnCours(course);
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
