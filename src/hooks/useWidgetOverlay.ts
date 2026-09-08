import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import {
  useCourseStore,
  useSessionStore,
  useStatsStore,
  useSettingsStore,
} from '../store';

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

export const useWidgetOverlay = (connectToNativeEvents = false): UseWidgetOverlayReturn => {
  const { course, demarrerCourse, clientMonte, arriveeDestination, annulerCourse } = useCourseStore();
  const { terminerCourse } = useStatsStore();
  const { settings } = useSettingsStore();
  const {
    session,
    commencerService,
    mettreEnPause,
    reprendreService,
  } = useSessionStore();
  
  const isSupported = Platform.OS === 'android';
  const eventEmitter = useRef<NativeEventEmitter | null>(null);
  
  // Références stables pour les callbacks
  const courseRef = useRef(course);
  courseRef.current = course;
  
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const sessionRef = useRef(session);
  sessionRef.current = session;

  // Actions du widget
  const handleActionPrincipale = useCallback(() => {
    const currentCourse = courseRef.current;
    const currentSession = sessionRef.current;

    if (currentSession.etat === 'HORS_SERVICE') {
      commencerService();
      return;
    }

    if (currentSession.etat === 'EN_PAUSE') {
      reprendreService();
      return;
    }

    switch (currentCourse.etat) {
      case 'REPOS':
        demarrerCourse();
        break;
      case 'PICKUP':
        clientMonte();
        break;
      case 'EN_COURSE':
        const tempsEcoule = currentCourse.tempsDebut
          ? Math.floor((Date.now() - currentCourse.tempsDebut) / 1000)
          : currentCourse.tempsEcoule;
        const tarifs = settingsRef.current.tarifs;
        const revenu = tarifs.priseEnCharge + (tempsEcoule / 60) * tarifs.parMinute;
        terminerCourse(tempsEcoule, revenu);
        arriveeDestination();
        break;
    }
  }, [
    arriveeDestination,
    clientMonte,
    commencerService,
    demarrerCourse,
    reprendreService,
    terminerCourse,
  ]);

  const handleActionSecondaire = useCallback(() => {
    const currentCourse = courseRef.current;

    if (sessionRef.current.etat !== 'EN_SERVICE') {
      return;
    }

    switch (currentCourse.etat) {
      case 'REPOS':
        mettreEnPause();
        break;
      case 'PICKUP':
        annulerCourse();
        break;
      case 'EN_COURSE':
        const tempsEcoule = currentCourse.tempsDebut
          ? Math.floor((Date.now() - currentCourse.tempsDebut) / 1000)
          : currentCourse.tempsEcoule;
        const tarifs = settingsRef.current.tarifs;
        const revenu = tarifs.priseEnCharge + (tempsEcoule / 60) * tarifs.parMinute;
        terminerCourse(tempsEcoule, revenu);
        arriveeDestination();
        break;
    }
  }, [annulerCourse, arriveeDestination, mettreEnPause, terminerCourse]);

  // Initialiser l'écouteur d'événements
  useEffect(() => {
    if (!isSupported || !connectToNativeEvents) return;
    
    eventEmitter.current = new NativeEventEmitter(WidgetOverlay);
    
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
  }, [
    connectToNativeEvents,
    isSupported,
    handleActionPrincipale,
    handleActionSecondaire,
  ]);

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

  // Demander la permission
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

  // Mettre à jour l'overlay - envoie tempsDebut et tarifs, le service calcule le reste
  const updateOverlay = useCallback(async () => {
    if (!isSupported) return;
    try {
      await WidgetOverlay.updateOverlay(
        course.etat,
        course.tempsDebut || 0,  // timestamp de début, pas temps écoulé
        settings.tarifs.priseEnCharge,
        settings.tarifs.parMinute,
        session.etat,
        session.tempsDebutService || 0,
        session.tempsDebutPause || 0,
        session.tempsPauseCumule,
      );
    } catch (e) {
      console.error('Erreur updateOverlay:', e);
    }
  }, [
    isSupported,
    course.etat,
    course.tempsDebut,
    settings.tarifs.priseEnCharge,
    settings.tarifs.parMinute,
    session.etat,
    session.tempsDebutService,
    session.tempsDebutPause,
    session.tempsPauseCumule,
  ]);

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
    const syncRunningOverlay = async () => {
      if (isSupported && connectToNativeEvents && await isRunning()) {
        await updateOverlay();
      }
    };

    syncRunningOverlay();
  }, [
    connectToNativeEvents,
    isSupported,
    course.etat,
    course.tempsDebut,
    session.etat,
    session.tempsDebutService,
    session.tempsDebutPause,
    session.tempsPauseCumule,
    isRunning,
    updateOverlay,
  ]);

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
