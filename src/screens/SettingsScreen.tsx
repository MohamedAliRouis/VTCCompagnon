import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '../store';
import { COULEURS } from '../constants';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { settings, setTarifs, setNotifications, setObjectifJournalier } =
    useSettingsStore();
  const [priseEnCharge, setPriseEnCharge] = React.useState(
    settings.tarifs.priseEnCharge.toString()
  );
  const [parMinute, setParMinute] = React.useState(
    settings.tarifs.parMinute.toString()
  );
  const [objectif, setObjectif] = React.useState(
    settings.objectifJournalier?.toString() ?? ''
  );

  // Les settings se chargent en asynchrone : resynchroniser les champs quand
  // les vraies valeurs sauvegardées arrivent (sinon ils restent sur les
  // valeurs par défaut affichées au premier render).
  React.useEffect(() => {
    setPriseEnCharge(settings.tarifs.priseEnCharge.toString());
    setParMinute(settings.tarifs.parMinute.toString());
    setObjectif(settings.objectifJournalier?.toString() ?? '');
  }, [
    settings.tarifs.priseEnCharge,
    settings.tarifs.parMinute,
    settings.objectifJournalier,
  ]);

  const sauvegarderTarifs = () => {
    const pec = parseFloat(priseEnCharge.replace(',', '.'));
    const min = parseFloat(parMinute.replace(',', '.'));

    if (isNaN(pec) || isNaN(min) || pec < 0 || min < 0) {
      Alert.alert('Erreur', 'Veuillez entrer des valeurs valides');
      return;
    }

    setTarifs({
      ...settings.tarifs,
      priseEnCharge: pec,
      parMinute: min,
    });

    Alert.alert('Succès', 'Tarifs mis à jour');
  };

  const sauvegarderObjectif = () => {
    const trim = objectif.trim();
    if (trim === '') {
      setObjectifJournalier(null);
      return;
    }
    const val = parseFloat(trim.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      Alert.alert('Erreur', 'Objectif invalide');
      return;
    }
    setObjectifJournalier(val);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top }}
    >
      <Text style={styles.titre}>⚙️ Paramètres</Text>

      {/* Tarifs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Tarifs estimés</Text>

        <View style={styles.champ}>
          <Text style={styles.label}>Prise en charge (€)</Text>
          <TextInput
            style={styles.input}
            value={priseEnCharge}
            onChangeText={setPriseEnCharge}
            keyboardType="decimal-pad"
            placeholder="2.50"
            placeholderTextColor={COULEURS.texteFaible}
          />
        </View>

        <View style={styles.champ}>
          <Text style={styles.label}>Par minute (€)</Text>
          <TextInput
            style={styles.input}
            value={parMinute}
            onChangeText={setParMinute}
            keyboardType="decimal-pad"
            placeholder="0.35"
            placeholderTextColor={COULEURS.texteFaible}
          />
        </View>

        <TouchableOpacity style={styles.bouton} onPress={sauvegarderTarifs}>
          <Text style={styles.texteBouton}>Sauvegarder les tarifs</Text>
        </TouchableOpacity>
      </View>

      {/* Objectif */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Objectif journalier</Text>
        <View style={styles.champ}>
          <Text style={styles.label}>Revenu cible par jour (€) — optionnel</Text>
          <TextInput
            style={styles.input}
            value={objectif}
            onChangeText={setObjectif}
            onBlur={sauvegarderObjectif}
            onSubmitEditing={sauvegarderObjectif}
            keyboardType="decimal-pad"
            placeholder="ex. 150"
            placeholderTextColor={COULEURS.texteFaible}
          />
        </View>
      </View>

      {/* Préférences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Préférences</Text>

        <View style={styles.option}>
          <Text style={styles.labelOption}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={setNotifications}
            trackColor={{ false: COULEURS.separateur, true: COULEURS.accent }}
            thumbColor={COULEURS.texte}
          />
        </View>
      </View>

      {/* À propos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>À propos</Text>
        <View style={styles.carte}>
          <Text style={styles.texteAPropos}>
            VTC Compagnon v0.1.0{'\n'}
            Assistant personnel pour chauffeurs VTC
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COULEURS.fond,
    padding: 16,
  },
  titre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COULEURS.texte,
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COULEURS.accentClair,
    marginBottom: 12,
  },
  champ: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COULEURS.texteSecondaire,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 8,
    padding: 12,
    color: COULEURS.texte,
    fontSize: 16,
  },
  bouton: {
    backgroundColor: COULEURS.accent,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  texteBouton: {
    color: COULEURS.surAccent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COULEURS.separateur,
  },
  labelOption: {
    fontSize: 14,
    color: COULEURS.texte,
  },
  carte: {
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 12,
    padding: 16,
  },
  texteAPropos: {
    fontSize: 14,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
    lineHeight: 22,
  },
});
