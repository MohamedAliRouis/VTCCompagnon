import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, Platform, NativeEventEmitter } from 'react-native';
import {
  useCourseStore,
  useSessionStore,
  useStatsStore,
  useSettingsStore,
} from '../store';

const { WidgetOverlay } = NativeModules;

// Temps écoulé (s) + revenu estimé d'une course à partir de son timestamp de début.
const calcTempsEtRevenu = (
  tempsDebut: number | null,
  priseEnCharge: number,
  parMinute: number,
): [tempsEcoule: number, revenu: number] => {
  const tempsEcoule = tempsDebut
    ? Math.floor((Date.now() - tempsDebut) / 1000)
    : 0;
  return [tempsEcoule, priseEnCharge + (tempsEcoule / 60) * parMinute];
};

interface UseWidgetOverlayReturn {
  isSupported: boolean;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  showOverlay: () => Promise<boolean>;
  hideOverlay: () => Promise<boolean>;
  updateOverlay: () => Promise<void>;
  isRunning: () => Promise<boolean>;
}

export const useWidgetOverlay = (
  connectToNativeEvents = false,
): UseWidgetOverlayReturn => {
  // Actions : références stables Zustand, ne provoquent aucun re-render.
  const demarrerCourse = useCourseStore(s => s.demarrerCourse);
  const clientMonte = useCourseStore(s => s.clientMonte);
  const arriveeDestination = useCourseStore(s => s.arriveeDestination);
  const annulerCourse = useCourseStore(s => s.annulerCourse);
  const terminerCourse = useStatsStore(s => s.terminerCourse);
  const commencerService = useSessionStore(s => s.commencerService);
  const mettreEnPause = useSessionStore(s => s.mettreEnPause);
  const reprendreService = useSessionStore(s => s.reprendreService);

  // État : sélecteurs fins. Ce hook est monté dans App ; on ne lit que les
  // champs qui déclenchent une transition (jamais tempsEcoule / tempsServiceEcoule
  // qui changent chaque seconde), pour ne pas re-render tout le navigateur.
  const courseEtat = useCourseStore(s => s.course.etat);
  const courseTempsDebut = useCourseStore(s => s.course.tempsDebut);
  const sessionEtat = useSessionStore(s => s.session.etat);
  const tempsDebutService = useSessionStore(s => s.session.tempsDebutService);
  const tempsDebutPause = useSessionStore(s => s.session.tempsDebutPause);
  const tempsPauseCumule = useSessionStore(s => s.session.tempsPauseCumule);
  const tarifPriseEnCharge = useSettingsStore(
    s => s.settings.tarifs.priseEnCharge,
  );
  const tarifParMinute = useSettingsStore(s => s.settings.tarifs.parMinute);

  const isSupported = Platform.OS === 'android';
  const eventEmitter = useRef<NativeEventEmitter | null>(null);

  // Snapshot lu par les callbacks natifs : évite de recréer les listeners
  // (et donc de réabonner le NativeEventEmitter) à chaque changement d'état.
  const stateRef = useRef({
    courseEtat,
    courseTempsDebut,
    sessionEtat,
    tarifPriseEnCharge,
    tarifParMinute,
  });
  stateRef.current = {
    courseEtat,
    courseTempsDebut,
    sessionEtat,
    tarifPriseEnCharge,
    tarifParMinute,
  };

  // Actions du widget
  const handleActionPrincipale = useCallback(() => {
    const { sessionEtat: sEtat, courseEtat: cEtat, courseTempsDebut: cDebut } =
      stateRef.current;

    if (sEtat === 'HORS_SERVICE') {
      commencerService();
      return;
    }

    if (sEtat === 'EN_PAUSE') {
      reprendreService();
      return;
    }

    switch (cEtat) {
      case 'REPOS':
        demarrerCourse();
        break;
      case 'PICKUP':
        clientMonte();
        break;
      case 'EN_COURSE': {
        const { tarifPriseEnCharge: pec, tarifParMinute: min } = stateRef.current;
        const [tempsEcoule, revenu] = calcTempsEtRevenu(cDebut, pec, min);
        terminerCourse(tempsEcoule, revenu);
        arriveeDestination();
        break;
      }
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
    const { sessionEtat: sEtat, courseEtat: cEtat, courseTempsDebut: cDebut } =
      stateRef.current;

    if (sEtat !== 'EN_SERVICE') {
      return;
    }

    switch (cEtat) {
      case 'REPOS':
        mettreEnPause();
        break;
      case 'PICKUP':
        annulerCourse();
        break;
      case 'EN_COURSE': {
        const { tarifPriseEnCharge: pec, tarifParMinute: min } = stateRef.current;
        const [tempsEcoule, revenu] = calcTempsEtRevenu(cDebut, pec, min);
        terminerCourse(tempsEcoule, revenu);
        arriveeDestination();
        break;
      }
    }
  }, [annulerCourse, arriveeDestination, mettreEnPause, terminerCourse]);

  // Initialiser l'écouteur d'événements
  useEffect(() => {
    if (!isSupported || !connectToNativeEvents) return;

    eventEmitter.current = new NativeEventEmitter(WidgetOverlay);

    const subscriptionPrincipale = eventEmitter.current.addListener(
      'WidgetActionPrincipale',
      handleActionPrincipale,
    );

    const subscriptionSecondaire = eventEmitter.current.addListener(
      'WidgetActionSecondaire',
      handleActionSecondaire,
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
        courseEtat,
        courseTempsDebut || 0, // timestamp de début, pas temps écoulé
        tarifPriseEnCharge,
        tarifParMinute,
        sessionEtat,
        tempsDebutService || 0,
        tempsDebutPause || 0,
        tempsPauseCumule,
      );
    } catch (e) {
      console.error('Erreur updateOverlay:', e);
    }
  }, [
    isSupported,
    courseEtat,
    courseTempsDebut,
    tarifPriseEnCharge,
    tarifParMinute,
    sessionEtat,
    tempsDebutService,
    tempsDebutPause,
    tempsPauseCumule,
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
      if (isSupported && connectToNativeEvents && (await isRunning())) {
        await updateOverlay();
      }
    };

    syncRunningOverlay();
  }, [connectToNativeEvents, isSupported, isRunning, updateOverlay]);

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
