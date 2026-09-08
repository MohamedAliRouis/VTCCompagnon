import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView 
} from 'react-native';
import { useStatsStore, useSettingsStore } from '../../store';
import { formaterTemps, formaterArgent } from '../../utils/formatters';

interface StatsModalProps {
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ onClose }) => {
  const { statsJour, historique } = useStatsStore();
  const { settings } = useSettingsStore();

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.titre}>📊 Statistiques</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.fermer}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          {/* Stats du jour */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Aujourd'hui</Text>
            <View style={styles.ligne}>
              <Text style={styles.label}>Courses</Text>
              <Text style={styles.valeur}>{statsJour.nbCourses}</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Temps total</Text>
              <Text style={styles.valeur}>{formaterTemps(statsJour.tempsTotal)}</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Revenu estimé</Text>
              <Text style={[styles.valeur, styles.revenuHighlight]}>
                {formaterArgent(statsJour.revenuTotal)}
              </Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Moyenne / course</Text>
              <Text style={styles.valeur}>
                {statsJour.nbCourses > 0 
                  ? formaterArgent(statsJour.revenuTotal / statsJour.nbCourses)
                  : '0,00 €'}
              </Text>
            </View>
          </View>

          {/* Historique */}
          {historique.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>7 derniers jours</Text>
              {historique.map((jour, index) => (
                <View key={index} style={styles.ligneHistorique}>
                  <Text style={styles.dateHistorique}>{jour.date}</Text>
                  <Text style={styles.statsHistorique}>
                    {jour.nbCourses} courses · {formaterArgent(jour.revenuTotal)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Tarifs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitre}>Tarifs estimés</Text>
            <View style={styles.ligne}>
              <Text style={styles.label}>Prise en charge</Text>
              <Text style={styles.valeur}>{formaterArgent(settings.tarifs.priseEnCharge)}</Text>
            </View>
            <View style={styles.ligne}>
              <Text style={styles.label}>Par minute</Text>
              <Text style={styles.valeur}>{formaterArgent(settings.tarifs.parMinute)}</Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={styles.boutonFermer} onPress={onClose}>
          <Text style={styles.texteBoutonFermer}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    width: '85%',
    maxHeight: '80%',
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  titre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  fermer: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  body: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  valeur: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  revenuHighlight: {
    color: '#27ae60',
  },
  ligneHistorique: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dateHistorique: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  statsHistorique: {
    fontSize: 12,
    color: '#fff',
  },
  boutonFermer: {
    backgroundColor: '#3498db',
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  texteBoutonFermer: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
