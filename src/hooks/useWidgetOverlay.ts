import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import { useCourseStore, useStatsStore } from '../store';

const { WidgetOverlay } = NativeModules;

interface UseWidgetOverlayReturn {
  isSupported: boolean;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  showOverlay: () => Promise<boolean>;
  hideOverlay: () => Promise<boolean>;
  updateOverlay: () => Promise<void>;
  isRunning: () => Promise<boolean>;
}

export const useWidgetOverlay = (): UseWidgetOverlayReturn => {
  const { course, demarrerCourse, clientMonte, arriveeDestination, terminerRetour, annulerCourse, nouvelleCourse } = useCourseStore();
  const { terminerCourse } = useStatsStore();
  
  const isSupported = Platform.OS === 'android';
  const eventEmitter = useRef<NativeEventEmitter | null>(null);
  
  // Références stables pour les callbacks
  const courseRef = useRef(course);
  courseRef.current = course;

  // Actions du widget (définies avec useRef pour éviter les re-renders)
  const handleActionPrincipale = useCallback(() => {
    const currentCourse = courseRef.current;
    switch (currentCourse.etat) {
      case 'REPOS':
        demarrerCourse();
        break;
      case 'PICKUP':
        clientMonte();
        break;
      case 'EN_COURSE':
        terminerCourse(currentCourse.tempsEcoule, currentCourse.revenuEstime);
        arriveeDestination();
        break;
      case 'RETOUR':
        terminerRetour();
        break;
    }
  }, [demarrerCourse, clientMonte, arriveeDestination, terminerRetour, terminerCourse]);

  const handleActionSecondaire = useCallback(() => {
    const currentCourse = courseRef.current;
    switch (currentCourse.etat) {
      case 'PICKUP':
        annulerCourse();
        break;
      case 'EN_COURSE':
        terminerCourse(currentCourse.tempsEcoule, currentCourse.revenuEstime);
        arriveeDestination();
        break;
      case 'RETOUR':
        nouvelleCourse();
        break;
    }
  }, [annulerCourse, arriveeDestination, nouvelleCourse, terminerCourse]);

  // Initialiser l'écouteur d'événements
  useEffect(() => {
    if (!isSupported) return;
    
    eventEmitter.current = new NativeEventEmitter(WidgetOverlay);
    
    // Écouter les actions depuis l'overlay
    const subscriptionPrincipale = eventEmitter.current.addListener(
      'WidgetActionPrincipale',
      handleActionPrincipale
    );
    
    const subscriptionSecondaire = eventEmitter.current.addListener(
      'WidgetActionSecondaire',
      handleActionSecondaire
    );
    
    return () => {
      subscriptionPrincipale.remove();
      subscriptionSecondaire.remove();
    };
  }, [isSupported, handleActionPrincipale, handleActionSecondaire]);

  // Vérifier la permission
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.checkPermission();
    } catch (e) {
      console.error('Erreur checkPermission:', e);
      return false;
    }
  }, [isSupported]);

  // Demander la permission (ouvre les paramètres)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.requestPermission();
    } catch (e) {
      console.error('Erreur requestPermission:', e);
      return false;
    }
  }, [isSupported]);

  // Afficher l'overlay
  const showOverlay = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.showOverlay();
    } catch (e) {
      console.error('Erreur showOverlay:', e);
      return false;
    }
  }, [isSupported]);

  // Cacher l'overlay
  const hideOverlay = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.hideOverlay();
    } catch (e) {
      console.error('Erreur hideOverlay:', e);
      return false;
    }
  }, [isSupported]);

  // Mettre à jour l'overlay avec l'état actuel
  const updateOverlay = useCallback(async () => {
    if (!isSupported) return;
    try {
      await WidgetOverlay.updateOverlay(
        course.etat,
        course.tempsEcoule,
        course.revenuEstime
      );
    } catch (e) {
      console.error('Erreur updateOverlay:', e);
    }
  }, [isSupported, course.etat, course.tempsEcoule, course.revenuEstime]);

  // Vérifier si l'overlay est en cours d'exécution
  const isRunning = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.isOverlayRunning();
    } catch (e) {
      console.error('Erreur isRunning:', e);
      return false;
    }
  }, [isSupported]);

  // Mettre à jour l'overlay quand l'état change
  useEffect(() => {
    if (isSupported) {
      updateOverlay();
    }
  }, [isSupported, course.etat, course.tempsEcoule, course.revenuEstime, updateOverlay]);

  return {
    isSupported,
    checkPermission,
    requestPermission,
    showOverlay,
    hideOverlay,
    updateOverlay,
    isRunning,
  };
};
