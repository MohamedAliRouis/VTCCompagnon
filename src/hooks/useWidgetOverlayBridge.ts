import { useEffect, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter } from 'react-native';
import {
  useCourseStore,
  useSessionStore,
  useStatsStore,
  useSettingsStore,
} from '../store';
import { useOverlayControls } from './useOverlayControls';

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

/**
 * À monter une seule fois (dans `App`). Relaie les actions des boutons de
 * l'overlay natif vers les stores, et repousse l'état vers l'overlay à chaque
 * transition. Sélecteurs fins : `App` ne re-render que sur une vraie transition,
 * jamais sur les ticks chrono.
 */
export const useWidgetOverlayBridge = (): void => {
  const { isSupported, isRunning, updateOverlay } = useOverlayControls();

  // Actions : références stables Zustand.
  const demarrerCourse = useCourseStore(s => s.demarrerCourse);
  const clientMonte = useCourseStore(s => s.clientMonte);
  const arriveeDestination = useCourseStore(s => s.arriveeDestination);
  const annulerCourse = useCourseStore(s => s.annulerCourse);
  const terminerCourse = useStatsStore(s => s.terminerCourse);
  const commencerService = useSessionStore(s => s.commencerService);
  const mettreEnPause = useSessionStore(s => s.mettreEnPause);
  const reprendreService = useSessionStore(s => s.reprendreService);

  // État : champs de transition uniquement (jamais tempsEcoule / tempsServiceEcoule).
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

  // Snapshot lu par les callbacks natifs : évite de réabonner le
  // NativeEventEmitter à chaque changement d'état.
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
        const { tarifPriseEnCharge: pec, tarifParMinute: min } =
          stateRef.current;
        const [tempsEcoule, revenu] = calcTempsEtRevenu(cDebut, pec, min);
        terminerCourse({
          tempsEcoule,
          revenu,
          debut: cDebut ?? Date.now() - tempsEcoule * 1000,
        });
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
    const { sessionEtat: sEtat, courseEtat: cEtat } = stateRef.current;

    if (sEtat !== 'EN_SERVICE') {
      return;
    }

    // Le bouton secondaire n'est visible qu'en REPOS (PAUSE) et PICKUP (ANNULER).
    if (cEtat === 'REPOS') {
      mettreEnPause();
    } else if (cEtat === 'PICKUP') {
      annulerCourse();
    }
  }, [annulerCourse, mettreEnPause]);

  // Écouteur des actions de l'overlay natif.
  useEffect(() => {
    if (!isSupported) return;

    const emitter = new NativeEventEmitter(WidgetOverlay);
    const subP = emitter.addListener(
      'WidgetActionPrincipale',
      handleActionPrincipale,
    );
    const subS = emitter.addListener(
      'WidgetActionSecondaire',
      handleActionSecondaire,
    );

    return () => {
      subP.remove();
      subS.remove();
    };
  }, [isSupported, handleActionPrincipale, handleActionSecondaire]);

  // Repousse l'état vers l'overlay à chaque transition, s'il tourne.
  useEffect(() => {
    let annule = false;
    (async () => {
      if (isSupported && (await isRunning()) && !annule) {
        await updateOverlay();
      }
    })();
    return () => {
      annule = true;
    };
  }, [
    isSupported,
    isRunning,
    updateOverlay,
    courseEtat,
    courseTempsDebut,
    sessionEtat,
    tempsDebutService,
    tempsDebutPause,
    tempsPauseCumule,
    tarifPriseEnCharge,
    tarifParMinute,
  ]);
};
