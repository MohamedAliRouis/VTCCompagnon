import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatsModal } from '../components/Stats';
import { useCourseStore, useSettingsStore, useStatsStore } from '../store';
import { useWidgetOverlay } from '../hooks';
import { COULEURS_ETAT, TEXTES_ETAT } from '../constants';
import { formaterArgent, formaterTemps } from '../utils/formatters';

const DESCRIPTIONS_ETAT = {
  REPOS: 'Prêt pour une nouvelle course',
  PICKUP: 'Trajet en cours vers le client',
  EN_COURSE: 'Client à bord',
} as const;

export const HomeScreen: React.FC = () => {
  const [modalStatsVisible, setModalStatsVisible] = useState(false);
  const [overlayActif, setOverlayActif] = useState(false);
  const [actionOverlayEnCours, setActionOverlayEnCours] = useState(false);

  const course = useCourseStore(state => state.course);
  const chargerDepuisStockage = useCourseStore(state => state.chargerDepuisStockage);
  const statsJour = useStatsStore(state => state.statsJour);
  const chargerStats = useStatsStore(state => state.chargerStats);
  const chargerSettings = useSettingsStore(state => state.chargerSettings);
  const {
    isSupported,
    checkPermission,
    requestPermission,
    showOverlay,
    hideOverlay,
    updateOverlay,
    isRunning,
  } = useWidgetOverlay();

  useEffect(() => {
    Promise.all([
      chargerDepuisStockage(),
      chargerStats(),
      chargerSettings(),
    ]).catch(error => console.error('Erreur initialisation:', error));
  }, [chargerDepuisStockage, chargerSettings, chargerStats]);

  useFocusEffect(
    useCallback(() => {
      let screenActive = true;

      isRunning().then(running => {
        if (screenActive) {
          setOverlayActif(running);
        }
      });

      return () => {
        screenActive = false;
      };
    }, [isRunning]),
  );

  const activerOverlay = async () => {
    if (!isSupported) {
      Alert.alert('Non supporté', 'Le widget flottant est disponible uniquement sur Android.');
      return;
    }

    setActionOverlayEnCours(true);
    const permissionAccordee = await checkPermission();

    if (!permissionAccordee) {
      setActionOverlayEnCours(false);
      Alert.alert(
        'Permission requise',
        'Autorisez VTC Compagnon à s’afficher par-dessus les autres applications.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Ouvrir les réglages', onPress: requestPermission },
        ],
      );
      return;
    }

    const affiche = await showOverlay();
    if (affiche) {
      await updateOverlay();
      setOverlayActif(true);
    } else {
      Alert.alert('Erreur', 'Impossible d’afficher le widget flottant.');
    }
    setActionOverlayEnCours(false);
  };

  const desactiverOverlay = async () => {
    setActionOverlayEnCours(true);
    await hideOverlay();
    setOverlayActif(false);
    setActionOverlayEnCours(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.surtitre}>VTC COMPAGNON</Text>
        <Text style={styles.titre}>Tableau de bord</Text>
        <Text style={styles.sousTitre}>Votre activité en un coup d’œil</Text>

        <View style={styles.courseCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>COURSE ACTUELLE</Text>
            <View style={styles.etatContainer}>
              <View
                style={[
                  styles.etatDot,
                  { backgroundColor: COULEURS_ETAT[course.etat] },
                ]}
              />
              <Text style={styles.etatTexte}>{TEXTES_ETAT[course.etat]}</Text>
            </View>
          </View>

          <Text style={styles.etatDescription}>
            {DESCRIPTIONS_ETAT[course.etat]}
          </Text>

          {course.etat !== 'REPOS' && (
            <View style={styles.courseMetrics}>
              <View>
                <Text style={styles.metricLabel}>Temps</Text>
                <Text style={styles.metricValue}>{formaterTemps(course.tempsEcoule)}</Text>
              </View>
              <View style={styles.metricRight}>
                <Text style={styles.metricLabel}>Revenu estimé</Text>
                <Text style={styles.revenuValue}>{formaterArgent(course.revenuEstime)}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitre}>Aujourd’hui</Text>
          <TouchableOpacity onPress={() => setModalStatsVisible(true)}>
            <Text style={styles.detailLink}>Voir le détail</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statsJour.nbCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formaterTemps(statsJour.tempsTotal)}</Text>
            <Text style={styles.statLabel}>Temps</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statRevenue}>{formaterArgent(statsJour.revenuTotal)}</Text>
            <Text style={styles.statLabel}>Revenus</Text>
          </View>
        </View>

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
              overlayActif ? styles.overlayButtonSecondary : styles.overlayButtonPrimary,
              actionOverlayEnCours && styles.buttonDisabled,
            ]}
          >
            <Text
              style={overlayActif ? styles.overlayButtonSecondaryText : styles.overlayButtonPrimaryText}
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

      <Modal
        animationType="slide"
        transparent
        visible={modalStatsVisible}
        onRequestClose={() => setModalStatsVisible(false)}
      >
        <StatsModal onClose={() => setModalStatsVisible(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10131f',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
  },
  surtitre: {
    color: '#5fa8ff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  titre: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 6,
  },
  sousTitre: {
    color: '#8f96aa',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  courseCard: {
    backgroundColor: '#1a1f30',
    borderColor: '#293148',
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: '#7f879b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  etatContainer: {
    alignItems: 'center',
    backgroundColor: '#111522',
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
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  etatDescription: {
    color: '#dce1ee',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
  },
  courseMetrics: {
    borderTopColor: '#2a3145',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingTop: 16,
  },
  metricRight: {
    alignItems: 'flex-end',
  },
  metricLabel: {
    color: '#7f879b',
    fontSize: 12,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '800',
    marginTop: 3,
  },
  revenuValue: {
    color: '#65d39a',
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
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  detailLink: {
    color: '#5fa8ff',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#1a1f30',
    borderRadius: 14,
    flex: 1,
    minHeight: 92,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  statRevenue: {
    color: '#65d39a',
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: '#7f879b',
    fontSize: 11,
    marginTop: 6,
  },
  overlayCard: {
    backgroundColor: '#1a1f30',
    borderColor: '#293148',
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
    backgroundColor: '#65d39a',
  },
  serviceInactif: {
    backgroundColor: '#697187',
  },
  overlayTitre: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  overlayDescription: {
    color: '#8f96aa',
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
    backgroundColor: '#4f9df8',
  },
  overlayButtonSecondary: {
    backgroundColor: '#252c40',
    borderColor: '#39435e',
    borderWidth: 1,
  },
  overlayButtonPrimaryText: {
    color: '#07101f',
    fontSize: 15,
    fontWeight: '800',
  },
  overlayButtonSecondaryText: {
    color: '#dce1ee',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
