import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useStatsStore } from '../store';
import { formaterTemps, formaterArgent } from '../utils/formatters';

export const HistoryScreen: React.FC = () => {
  const { historique, statsJour } = useStatsStore();

  // Calcul totaux semaine
  const totauxSemaine = historique.reduce(
    (acc, jour) => ({
      courses: acc.courses + jour.nbCourses,
      temps: acc.temps + jour.tempsTotal,
      revenu: acc.revenu + jour.revenuTotal,
    }),
    { courses: 0, temps: 0, revenu: 0 }
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titre}>📅 Historique</Text>

      {/* Aujourd'hui */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Aujourd'hui</Text>
        <View style={styles.carte}>
          <View style={styles.ligne}>
            <Text style={styles.label}>Courses</Text>
            <Text style={styles.valeur}>{statsJour.nbCourses}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.label}>Temps</Text>
            <Text style={styles.valeur}>{formaterTemps(statsJour.tempsTotal)}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.label}>Revenu</Text>
            <Text style={[styles.valeur, styles.revenu]}>
              {formaterArgent(statsJour.revenuTotal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Semaine */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>7 derniers jours</Text>
        <View style={styles.carte}>
          <View style={styles.ligne}>
            <Text style={styles.label}>Total courses</Text>
            <Text style={styles.valeur}>{totauxSemaine.courses}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.label}>Temps total</Text>
            <Text style={styles.valeur}>{formaterTemps(totauxSemaine.temps)}</Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.label}>Revenu total</Text>
            <Text style={[styles.valeur, styles.revenu]}>
              {formaterArgent(totauxSemaine.revenu)}
            </Text>
          </View>
          <View style={styles.ligne}>
            <Text style={styles.label}>Moyenne / jour</Text>
            <Text style={styles.valeur}>
              {historique.length > 0 
                ? formaterArgent(totauxSemaine.revenu / historique.length)
                : '0,00 €'}
            </Text>
          </View>
        </View>
      </View>

      {/* Détail par jour */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Détail par jour</Text>
        {historique.length === 0 ? (
          <Text style={styles.vide}>Aucun historique</Text>
        ) : (
          historique.map((jour, index) => (
            <View key={index} style={styles.carteJour}>
              <Text style={styles.dateJour}>{jour.date}</Text>
              <View style={styles.statsJour}>
                <Text style={styles.statJour}>
                  {jour.nbCourses} course{jour.nbCourses > 1 ? 's' : ''}
                </Text>
                <Text style={styles.statJour}>{formaterTemps(jour.tempsTotal)}</Text>
                <Text style={[styles.statJour, styles.revenu]}>
                  {formaterArgent(jour.revenuTotal)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    padding: 16,
  },
  titre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffd700',
    marginBottom: 10,
  },
  carte: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
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
  revenu: {
    color: '#27ae60',
  },
  vide: {
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  carteJour: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  dateJour: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsJour: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statJour: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
});
