import { useCallback } from 'react';
import { NativeModules, Platform } from 'react-native';
import { useCourseStore, useSessionStore, useSettingsStore } from '../store';

const { WidgetOverlay } = NativeModules;

export interface OverlayControls {
  isSupported: boolean;
  checkPermission: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  showOverlay: () => Promise<boolean>;
  hideOverlay: () => Promise<boolean>;
  updateOverlay: () => Promise<void>;
  isRunning: () => Promise<boolean>;
}

const isSupported = Platform.OS === 'android';

/**
 * Pilotage impératif de l'overlay natif. N'abonne à aucun store : peut être
 * appelé depuis n'importe quel écran sans provoquer de re-render. `updateOverlay`
 * lit l'état courant à la volée via `getState()`.
 *
 * Le relais des actions des boutons de l'overlay et le push automatique de
 * l'état à chaque transition vivent dans `useWidgetOverlayBridge` (monté une
 * seule fois dans `App`).
 */
export const useOverlayControls = (): OverlayControls => {
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.checkPermission();
    } catch (e) {
      console.error('Erreur checkPermission:', e);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.requestPermission();
    } catch (e) {
      console.error('Erreur requestPermission:', e);
      return false;
    }
  }, []);

  const showOverlay = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.showOverlay();
    } catch (e) {
      console.error('Erreur showOverlay:', e);
      return false;
    }
  }, []);

  const hideOverlay = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.hideOverlay();
    } catch (e) {
      console.error('Erreur hideOverlay:', e);
      return false;
    }
  }, []);

  // Envoie les timestamps + tarifs ; le service natif calcule le reste.
  const updateOverlay = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    const { course } = useCourseStore.getState();
    const { session } = useSessionStore.getState();
    const { tarifs } = useSettingsStore.getState().settings;
    try {
      await WidgetOverlay.updateOverlay(
        course.etat,
        course.tempsDebut || 0,
        tarifs.priseEnCharge,
        tarifs.parMinute,
        session.etat,
        session.tempsDebutService || 0,
        session.tempsDebutPause || 0,
        session.tempsPauseCumule,
      );
    } catch (e) {
      console.error('Erreur updateOverlay:', e);
    }
  }, []);

  const isRunning = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    try {
      return await WidgetOverlay.isOverlayRunning();
    } catch (e) {
      console.error('Erreur isRunning:', e);
      return false;
    }
  }, []);

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
