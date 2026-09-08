import React, { useRef, useEffect } from 'react';
import { 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Animated, 
  PanResponder,
  Dimensions 
} from 'react-native';
import { useCourseStore, useStatsStore } from '../../store';
import { COULEURS_ETAT } from '../../constants';
import { formaterArgent } from '../../utils/formatters';
import { WidgetBadge } from './WidgetBadge';
import { WidgetChrono } from './WidgetChrono';
import { WidgetActions } from './WidgetActions';
import { useWidgetOverlay } from '../../hooks/useWidgetOverlay';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WidgetFlottantProps {
  onStatsPress?: () => void;
}

export const WidgetFlottant: React.FC<WidgetFlottantProps> = ({ onStatsPress }) => {
  const { 
    course, 
    demarrerCourse, 
    clientMonte, 
    arriveeDestination, 
    terminerRetour, 
    annulerCourse, 
    nouvelleCourse,
    majTemps 
  } = useCourseStore();
  const { statsJour, terminerCourse } = useStatsStore();
  
  // Hook pour l'overlay Android (synchronisation)
  const { updateOverlay } = useWidgetOverlay();
  
  // Référence pour l'intervalle du chronomètre
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Effet pour le chronomètre + mise à jour overlay
  useEffect(() => {
    if (course.etat !== 'REPOS' && course.tempsDebut) {
      // Démarrer le chronomètre
      intervalRef.current = setInterval(() => {
        const maintenant = Date.now();
        const ecoule = Math.floor((maintenant - course.tempsDebut!) / 1000);
        majTemps(ecoule);
      }, 1000);
    } else {
      // Arrêter le chronomètre
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Nettoyage
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [course.etat, course.tempsDebut, majTemps]);

  // Synchroniser avec l'overlay Android quand les valeurs changent
  useEffect(() => {
    updateOverlay();
  }, [course.etat, course.tempsEcoule, course.revenuEstime, updateOverlay]);
  
  // Position draggable
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - 180, y: 100 })).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: () => {
        pan.extractOffset();
      },
    })
  ).current;

  // Actions selon l'état
  const actionPrincipale = () => {
    switch (course.etat) {
      case 'REPOS':
        demarrerCourse();
        break;
      case 'PICKUP':
        clientMonte();
        break;
      case 'EN_COURSE':
        // Enregistrer les stats avant de passer à RETOUR
        terminerCourse(course.tempsEcoule, course.revenuEstime);
        arriveeDestination();
        break;
      case 'RETOUR':
        terminerRetour();
        break;
    }
  };

  const actionSecondaire = () => {
    switch (course.etat) {
      case 'PICKUP':
        annulerCourse();
        break;
      case 'EN_COURSE':
        // Enregistrer les stats si on termine prématurément
        terminerCourse(course.tempsEcoule, course.revenuEstime);
        arriveeDestination();
        break;
      case 'RETOUR':
        nouvelleCourse();
        break;
    }
  };

  return (
    <Animated.View
      style={[
        styles.widget,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          backgroundColor: COULEURS_ETAT[course.etat],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* En-tête */}
      <TouchableOpacity 
        style={styles.header}
        onLongPress={onStatsPress}
        delayLongPress={500}
      >
        <Text style={styles.titre}>🚗 VTC</Text>
        <WidgetBadge etat={course.etat} />
      </TouchableOpacity>

      {/* Chronomètre (si actif) */}
      {course.etat !== 'REPOS' && (
        <WidgetChrono 
          tempsEcoule={course.tempsEcoule} 
          revenuEstime={course.revenuEstime} 
        />
      )}

      {/* Boutons */}
      <WidgetActions
        etat={course.etat}
        onActionPrincipale={actionPrincipale}
        onActionSecondaire={actionSecondaire}
      />

      {/* Stats rapides */}
      <TouchableOpacity 
        style={styles.stats}
        onPress={onStatsPress}
      >
        <Text style={styles.texteStats}>
          Aujourd'hui: {statsJour.nbCourses} courses · {formaterArgent(statsJour.revenuTotal)}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  widget: {
    position: 'absolute',
    width: 160,
    borderRadius: 16,
    padding: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  titre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  stats: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  texteStats: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
  },
});
