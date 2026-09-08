import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useCourseStore,
  useSessionStore,
  useSettingsStore,
  useStatsStore,
} from '../store';
import { useOverlayControls } from '../hooks';
import { COULEURS, COULEURS_ETAT, TEXTES_ETAT } from '../constants';
import { formaterArgent, formaterTemps } from '../utils/formatters';

const DESCRIPTIONS_ETAT = {
  REPOS: 'Prêt pour une nouvelle course',
  PICKUP: 'Trajet en cours vers le client',
  EN_COURSE: 'Client à bord',
} as const;

const TEXTES_SESSION = {
  HORS_SERVICE: 'HORS SERVICE',
  EN_SERVICE: 'EN SERVICE',
  EN_PAUSE: 'EN PAUSE',
} as const;

// Fonds teintés des badges d'état de session (spécifiques à cet écran).
const BADGE_ACTIF = '#194b39';
const BADGE_PAUSE = '#5b431a';
const BADGE_INACTIF = '#303749';

// Sous-composants isolés : le tick chrono (chaque seconde) ne re-render que ce
// bloc, pas toute la page.
const MetriquesSession = React.memo<{ enPause: boolean }>(({ enPause }) => {
  const tempsServiceEcoule = useSessionStore(s => s.session.tempsServiceEcoule);
  const tempsPauseEcoule = useSessionStore(s => s.session.tempsPauseEcoule);
  const tempsPauseCumule = useSessionStore(s => s.session.tempsPauseCumule);

  return (
    <View style={styles.sessionMetrics}>
      <View style={styles.metricCol}>
        <Text style={styles.metricLabel}>Temps travaillé</Text>
        <Text style={styles.sessionTimeValue} numberOfLines={1} adjustsFontSizeToFit>
          {formaterTemps(tempsServiceEcoule)}
        </Text>
      </View>
      <View style={styles.metricColRight}>
        <Text style={styles.metricLabel}>
          {enPause ? 'Pause actuelle' : 'Pauses cumulées'}
        </Text>
        <Text style={styles.pauseTimeValue} numberOfLines={1} adjustsFontSizeToFit>
          {formaterTemps(enPause ? tempsPauseEcoule : tempsPauseCumule)}
        </Text>
      </View>
    </View>
  );
});
MetriquesSession.displayName = 'MetriquesSession';

const MetriquesCourse = React.memo(() => {
  const tempsEcoule = useCourseStore(s => s.course.tempsEcoule);
  const revenuEstime = useCourseStore(s => s.course.revenuEstime);

  return (
    <View style={styles.courseMetrics}>
      <View style={styles.metricCol}>
        <Text style={styles.metricLabel}>Temps</Text>
        <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
          {formaterTemps(tempsEcoule)}
        </Text>
      </View>
      <View style={styles.metricColRight}>
        <Text style={styles.metricLabel}>Revenu estimé</Text>
        <Text style={styles.revenuValue} numberOfLines={1} adjustsFontSizeToFit>
          {formaterArgent(revenuEstime)}
        </Text>
      </View>
    </View>
  );
});
MetriquesCourse.displayName = 'MetriquesCourse';

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<{ navigate: (n: string) => void }>();
  const [overlayActif, setOverlayActif] = useState(false);
  const [actionOverlayEnCours, setActionOverlayEnCours] = useState(false);
  const [attentePermission, setAttentePermission] = useState(false);

  // Sélecteurs fins : l'écran ne se re-render que sur une transition d'état.
  const courseEtat = useCourseStore(state => state.course.etat);
  const sessionEtat = useSessionStore(state => state.session.etat);
  const statsJour = useStatsStore(state => state.statsJour);
  const chargerStats = useStatsStore(state => state.chargerStats);
  const objectifJournalier = useSettingsStore(
    state => state.settings.objectifJournalier,
  );
  const annulationEnAttente = useCourseStore(
    state => state.annulationEnAttente,
  );
  const annulerFinDeCourse = useCourseStore(state => state.annulerFinDeCourse);
  const commencerService = useSessionStore(state => state.commencerService);
  const mettreEnPause = useSessionStore(state => state.mettreEnPause);
  const reprendreService = useSessionStore(state => state.reprendreService);
  const terminerService = useSessionStore(state => state.terminerService);
  const {
    isSupported,
    checkPermission,
    requestPermission,
    showOverlay,
    hideOverlay,
    updateOverlay,
    isRunning,
  } = useOverlayControls();

  useFocusEffect(
    useCallback(() => {
      let screenActive = true;

      isRunning().then(running => {
        if (screenActive) {
          setOverlayActif(running);
        }
      });
      // Rafraîchir les stats à chaque retour sur l'écran : couvre le passage
      // de minuit pendant que l'app était en arrière-plan.
      chargerStats();

      return () => {
        screenActive = false;
      };
    }, [isRunning, chargerStats]),
  );

  const afficherOverlay = useCallback(async () => {
    setActionOverlayEnCours(true);
    const affiche = await showOverlay();
    if (affiche) {
      await updateOverlay();
      setOverlayActif(true);
    } else {
      Alert.alert('Erreur', 'Impossible d’afficher le widget flottant.');
    }
    setActionOverlayEnCours(false);
  }, [showOverlay, updateOverlay]);

  const activerOverlay = async () => {
    if (!isSupported) {
      Alert.alert(
        'Non supporté',
        'Le widget flottant est disponible uniquement sur Android.',
      );
      return;
    }

    if (await checkPermission()) {
      await afficherOverlay();
      return;
    }

    Alert.alert(
      'Permission requise',
      'Autorisez VTC Compagnon à s’afficher par-dessus les autres applications.',
      [
        { text: 'Plus tard', style: 'cancel' },
        {
          text: 'Ouvrir les réglages',
          onPress: () => {
            setAttentePermission(true);
            requestPermission();
          },
        },
      ],
    );
  };

  // Retour depuis les réglages Android : si la permission vient d'être accordée,
  // on affiche le widget sans que l'utilisateur ait à re-tapper le bouton.
  useEffect(() => {
    if (!attentePermission) {
      return;
    }

    const sub = AppState.addEventListener('change', async etat => {
      if (etat !== 'active') {
        return;
      }
      setAttentePermission(false);
      if (await checkPermission()) {
        await afficherOverlay();
      }
    });

    return () => sub.remove();
  }, [attentePermission, checkPermission, afficherOverlay]);

  const desactiverOverlay = async () => {
    setActionOverlayEnCours(true);
    await hideOverlay();
    setOverlayActif(false);
    setActionOverlayEnCours(false);
  };

  const demanderPause = () => {
    if (courseEtat !== 'REPOS') {
      Alert.alert(
        'Course en cours',
        'Terminez ou annulez la course avant de prendre une pause.',
      );
      return;
    }
    mettreEnPause();
  };

  const demanderFinService = () => {
    if (courseEtat !== 'REPOS') {
      Alert.alert(
        'Course en cours',
        'Terminez ou annulez la course avant de clôturer votre service.',
      );
      return;
    }

    const { session } = useSessionStore.getState();
    Alert.alert(
      'Terminer le service ?',
      `Temps travaillé : ${formaterTemps(
        session.tempsServiceEcoule,
      )}\nPauses : ${formaterTemps(
        session.tempsPauseCumule + session.tempsPauseEcoule,
      )}`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', style: 'destructive', onPress: terminerService },
      ],
    );
  };

  const progression = objectifJournalier
    ? Math.min(100, (statsJour.revenuTotal / objectifJournalier) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.surtitre}>VTC COMPAGNON</Text>
        <Text style={styles.titre}>Tableau de bord</Text>

        {annulationEnAttente ? (
          <View style={styles.annulationBarre}>
            <Text style={styles.annulationTexte}>
              Course enregistrée · {formaterArgent(annulationEnAttente.revenu)}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={annulerFinDeCourse}
            >
              <Text style={styles.annulationLien}>Annuler</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sessionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>SESSION DE TRAVAIL</Text>
            <View
              style={[
                styles.sessionBadge,
                {
                  backgroundColor:
                    sessionEtat === 'EN_PAUSE'
                      ? BADGE_PAUSE
                      : sessionEtat === 'EN_SERVICE'
                        ? BADGE_ACTIF
                        : BADGE_INACTIF,
                },
              ]}
            >
              <Text style={styles.sessionBadgeText}>
                {TEXTES_SESSION[sessionEtat]}
              </Text>
            </View>
          </View>

          {sessionEtat === 'HORS_SERVICE' ? (
            <>
              <Text style={styles.sessionMessage}>
                Démarrez votre session pour suivre votre temps de travail et vos
                pauses.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={commencerService}
                style={styles.sessionPrimaryButton}
              >
                <Text style={styles.sessionPrimaryButtonText}>
                  Commencer mon service
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <MetriquesSession enPause={sessionEtat === 'EN_PAUSE'} />

              <TouchableOpacity
                accessibilityRole="button"
                onPress={
                  sessionEtat === 'EN_PAUSE' ? reprendreService : demanderPause
                }
                style={styles.sessionPrimaryButton}
              >
                <Text style={styles.sessionPrimaryButtonText}>
                  {sessionEtat === 'EN_PAUSE'
                    ? 'Reprendre mon service'
                    : 'Faire une pause'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={demanderFinService}
                style={styles.endSessionButton}
              >
                <Text style={styles.endSessionButtonText}>
                  Terminer mon service
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.courseCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>COURSE ACTUELLE</Text>
            <View style={styles.etatContainer}>
              <View
                style={[
                  styles.etatDot,
                  { backgroundColor: COULEURS_ETAT[courseEtat] },
                ]}
              />
              <Text style={styles.etatTexte}>{TEXTES_ETAT[courseEtat]}</Text>
            </View>
          </View>

          <Text style={styles.etatDescription}>
            {DESCRIPTIONS_ETAT[courseEtat]}
          </Text>

          {courseEtat !== 'REPOS' && <MetriquesCourse />}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitre}>Aujourd’hui</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Historique')}>
            <Text style={styles.detailLink}>Voir l’historique</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statsJour.nbCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {formaterTemps(statsJour.tempsTotal)}
            </Text>
            <Text style={styles.statLabel}>Conduite</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statRevenue}>
              {formaterArgent(statsJour.revenuTotal)}
            </Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>

        {objectifJournalier ? (
          <View style={styles.objectifBloc}>
            <View style={styles.objectifLigne}>
              <Text style={styles.objectifLabel}>Objectif du jour</Text>
              <Text style={styles.objectifValeur}>
                {formaterArgent(statsJour.revenuTotal)} /{' '}
                {formaterArgent(objectifJournalier)}
              </Text>
            </View>
            <View style={styles.objectifRail}>
              <View style={[styles.objectifJauge, { width: `${progression}%` }]} />
            </View>
          </View>
        ) : null}

        <View style={styles.overlayCard}>
          <View style={styles.overlayInfo}>
            <View style={styles.overlayTitleRow}>
              <View
                style={[
                  styles.serviceDot,
                  overlayActif ? styles.serviceActif : styles.serviceInactif,
                ]}
              />
              <Text style={styles.overlayTitre}>Widget flottant</Text>
            </View>
            <Text style={styles.overlayDescription}>
              {overlayActif
                ? 'Visible au-dessus de vos applications de conduite'
                : 'Activez-le avant de commencer votre service'}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={actionOverlayEnCours}
            onPress={overlayActif ? desactiverOverlay : activerOverlay}
            style={[
              styles.overlayButton,
              overlayActif
                ? styles.overlayButtonSecondary
                : styles.overlayButtonPrimary,
              actionOverlayEnCours && styles.buttonDisabled,
            ]}
          >
            <Text
              style={
                overlayActif
                  ? styles.overlayButtonSecondaryText
                  : styles.overlayButtonPrimaryText
              }
            >
              {actionOverlayEnCours
                ? 'Patientez…'
                : overlayActif
                  ? 'Masquer'
                  : 'Afficher le widget'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COULEURS.fond,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  surtitre: {
    color: COULEURS.accentClair,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  titre: {
    color: COULEURS.texte,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 22,
  },
  annulationBarre: {
    alignItems: 'center',
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.alerte,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  annulationTexte: {
    color: COULEURS.texteSecondaire,
    flex: 1,
    fontSize: 13,
  },
  annulationLien: {
    color: COULEURS.alerte,
    fontSize: 13,
    fontWeight: '800',
    paddingLeft: 12,
  },
  courseCard: {
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.carteBordure,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginTop: 14,
  },
  sessionCard: {
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.carteBordureAccent,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  sessionBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sessionBadgeText: {
    color: COULEURS.texte,
    fontSize: 11,
    fontWeight: '800',
  },
  sessionMessage: {
    color: COULEURS.texteSecondaire,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 20,
  },
  sessionMetrics: {
    borderTopColor: COULEURS.separateur,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
  },
  sessionTimeValue: {
    color: COULEURS.texte,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 3,
  },
  pauseTimeValue: {
    color: COULEURS.alerte,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 3,
  },
  sessionPrimaryButton: {
    alignItems: 'center',
    backgroundColor: COULEURS.accent,
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 56,
  },
  sessionPrimaryButtonText: {
    color: COULEURS.surAccent,
    fontSize: 15,
    fontWeight: '800',
  },
  endSessionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  endSessionButtonText: {
    color: COULEURS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: COULEURS.texteFaible,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  etatContainer: {
    alignItems: 'center',
    backgroundColor: COULEURS.fond,
    borderRadius: 20,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  etatDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 7,
    width: 10,
  },
  etatTexte: {
    color: COULEURS.texte,
    fontSize: 11,
    fontWeight: '800',
  },
  etatDescription: {
    color: COULEURS.texte,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
  },
  courseMetrics: {
    borderTopColor: COULEURS.separateur,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    paddingTop: 16,
  },
  metricCol: {
    flex: 1,
  },
  metricColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  metricLabel: {
    color: COULEURS.texteFaible,
    fontSize: 12,
  },
  metricValue: {
    color: COULEURS.texte,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 3,
  },
  revenuValue: {
    color: COULEURS.positif,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 3,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 26,
  },
  sectionTitre: {
    color: COULEURS.texte,
    fontSize: 18,
    fontWeight: '800',
  },
  detailLink: {
    color: COULEURS.accentClair,
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  objectifBloc: {
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.carteBordure,
    borderWidth: 1,
    borderRadius: 14,
    marginTop: 10,
    padding: 14,
  },
  objectifLigne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  objectifLabel: {
    color: COULEURS.texteFaible,
    fontSize: 12,
  },
  objectifValeur: {
    color: COULEURS.texte,
    fontSize: 12,
    fontWeight: '700',
  },
  objectifRail: {
    backgroundColor: COULEURS.separateur,
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  objectifJauge: {
    backgroundColor: COULEURS.positif,
    borderRadius: 4,
    height: 8,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.carteBordure,
    borderWidth: 1,
    borderRadius: 14,
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    color: COULEURS.texte,
    fontSize: 18,
    fontWeight: '800',
  },
  statRevenue: {
    color: COULEURS.positif,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: COULEURS.texteFaible,
    fontSize: 11,
    marginTop: 6,
  },
  overlayCard: {
    backgroundColor: COULEURS.carte,
    borderColor: COULEURS.carteBordure,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 24,
    padding: 18,
  },
  overlayInfo: {
    marginBottom: 16,
  },
  overlayTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  serviceDot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  serviceActif: {
    backgroundColor: COULEURS.positif,
  },
  serviceInactif: {
    backgroundColor: COULEURS.texteFaible,
  },
  overlayTitre: {
    color: COULEURS.texte,
    fontSize: 17,
    fontWeight: '800',
  },
  overlayDescription: {
    color: COULEURS.texteSecondaire,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  overlayButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 56,
  },
  overlayButtonPrimary: {
    backgroundColor: COULEURS.accent,
  },
  overlayButtonSecondary: {
    backgroundColor: COULEURS.boutonSecondaire,
    borderColor: COULEURS.boutonSecondaireBordure,
    borderWidth: 1,
  },
  overlayButtonPrimaryText: {
    color: COULEURS.surAccent,
    fontSize: 15,
    fontWeight: '800',
  },
  overlayButtonSecondaryText: {
    color: COULEURS.texte,
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
