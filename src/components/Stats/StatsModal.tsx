import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useStatsStore, useSettingsStore, useHistoryStore } from '../../store';
import { COULEURS } from '../../constants';
import {
  formaterTemps,
  formaterArgent,
  formaterDate,
  getDateJour,
} from '../../utils/formatters';
import { agregerParJour, ajouterJours } from '../../utils/historique';

interface StatsModalProps {
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ onClose }) => {
  const { statsJour } = useStatsStore();
  const { settings } = useSettingsStore();
  const courses = useHistoryStore(s => s.courses);
  const sessions = useHistoryStore(s => s.sessions);
  const agregatsLegacy = useHistoryStore(s => s.agregatsLegacy);

  const jours7 = useMemo(() => {
    const parJour = agregerParJour(courses, sessions, agregatsLegacy);
    const fin = getDateJour();
    const debut = ajouterJours(fin, -6);
    const liste = [];
    for (let d = debut; d <= fin; d = ajouterJours(d, 1)) {
      const j = parJour.get(d);
      if (j && (j.nbCourses > 0 || j.revenu > 0)) {
        liste.push(j);
      }
    }
    return liste.reverse();
  }, [courses, sessions, agregatsLegacy]);

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
          {jours7.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitre}>7 derniers jours</Text>
              {jours7.map(jour => (
                <View key={jour.date} style={styles.ligneHistorique}>
                  <Text style={styles.dateHistorique}>{formaterDate(jour.date)}</Text>
                  <Text style={styles.statsHistorique}>
                    {jour.nbCourses} courses · {formaterArgent(jour.revenu)}
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
    backgroundColor: COULEURS.fond,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
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
    borderBottomColor: COULEURS.separateur,
  },
  titre: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COULEURS.texte,
  },
  fermer: {
    fontSize: 24,
    color: COULEURS.texteSecondaire,
    padding: 4,
  },
  body: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 12,
    padding: 12,
  },
  sectionTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COULEURS.accentClair,
    marginBottom: 10,
  },
  ligne: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.separateur,
  },
  label: {
    fontSize: 14,
    color: COULEURS.texteSecondaire,
  },
  valeur: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COULEURS.texte,
  },
  revenuHighlight: {
    color: COULEURS.positif,
  },
  ligneHistorique: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.separateur,
  },
  dateHistorique: {
    fontSize: 12,
    color: COULEURS.texteFaible,
  },
  statsHistorique: {
    fontSize: 12,
    color: COULEURS.texte,
  },
  boutonFermer: {
    backgroundColor: COULEURS.accent,
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  texteBoutonFermer: {
    color: COULEURS.surAccent,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
