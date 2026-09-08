import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHistoryStore, useSettingsStore, useStatsStore } from '../store';
import { COULEURS, RETENTION_JOURS, RETENTIONS_POSSIBLES } from '../constants';

// --- petits composants ---

const Carte: React.FC<{
  titre: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ titre, hint, children }) => (
  <View style={styles.carte}>
    <Text style={styles.carteTitre}>{titre}</Text>
    {hint ? <Text style={styles.carteHint}>{hint}</Text> : null}
    {children}
  </View>
);

const ChampNombre: React.FC<{
  label: string;
  valeurStockee: string;
  onValider: (n: number | null) => void;
  optionnel?: boolean;
  placeholder?: string;
}> = ({ label, valeurStockee, onValider, optionnel, placeholder }) => {
  const [txt, setTxt] = useState(valeurStockee);

  // Resync quand la valeur persistée change (chargement async, effacement…).
  useEffect(() => setTxt(valeurStockee), [valeurStockee]);

  const valider = () => {
    const trim = txt.trim();
    if (trim === '') {
      if (optionnel) {
        onValider(null);
      } else {
        setTxt(valeurStockee); // champ obligatoire : on remet la dernière valeur
      }
      return;
    }
    const n = parseFloat(trim.replace(',', '.'));
    if (isNaN(n) || n < 0) {
      setTxt(valeurStockee);
      return;
    }
    onValider(n);
  };

  return (
    <View style={styles.champ}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={txt}
        onChangeText={setTxt}
        onBlur={valider}
        onSubmitEditing={valider}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor={COULEURS.texteFaible}
      />
    </View>
  );
};

function Segmente<T extends string | number>({
  options,
  valeur,
  onChange,
}: {
  options: { cle: T; label: string }[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map(o => {
        const actif = o.cle === valeur;
        return (
          <TouchableOpacity
            key={String(o.cle)}
            onPress={() => onChange(o.cle)}
            style={[styles.segmentBtn, actif && styles.segmentBtnActif]}
          >
            <Text
              style={[styles.segmentTxt, actif && styles.segmentTxtActif]}
            >
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// --- écran ---

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore(s => s.settings);
  const setTarifs = useSettingsStore(s => s.setTarifs);
  const setObjectifJournalier = useSettingsStore(s => s.setObjectifJournalier);
  const setRetentionJours = useSettingsStore(s => s.setRetentionJours);
  const setDebutSemaine = useSettingsStore(s => s.setDebutSemaine);
  const effacerHistorique = useHistoryStore(s => s.effacer);
  const resetJour = useStatsStore(s => s.resetJour);

  const retention = settings.retentionJours ?? RETENTION_JOURS;

  const confirmerEffacement = () => {
    Alert.alert(
      'Effacer les données ?',
      "Supprime tout l'historique des courses et des sessions ainsi que les " +
        'statistiques du jour. Les tarifs et réglages sont conservés. ' +
        'Action irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            effacerHistorique();
            resetJour();
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contenu, { paddingTop: insets.top }]}
    >
      <Text style={styles.titre}>⚙️ Paramètres</Text>

      <Carte
        titre="Tarification"
        hint="Sert à estimer le revenu d'une course. Enregistré automatiquement."
      >
        <ChampNombre
          label="Prise en charge (€)"
          valeurStockee={settings.tarifs.priseEnCharge.toString()}
          onValider={n =>
            n !== null &&
            setTarifs({ ...settings.tarifs, priseEnCharge: n })
          }
          placeholder="2.50"
        />
        <ChampNombre
          label="Prix par minute (€)"
          valeurStockee={settings.tarifs.parMinute.toString()}
          onValider={n =>
            n !== null && setTarifs({ ...settings.tarifs, parMinute: n })
          }
          placeholder="0.35"
        />
      </Carte>

      <Carte
        titre="Objectif"
        hint="Revenu visé par jour. Affiché sur l'accueil et l'historique. Laisser vide pour désactiver."
      >
        <ChampNombre
          label="Objectif journalier (€)"
          valeurStockee={settings.objectifJournalier?.toString() ?? ''}
          onValider={setObjectifJournalier}
          optionnel
          placeholder="ex. 150"
        />
      </Carte>

      <Carte titre="Affichage">
        <Text style={styles.label}>Début de semaine</Text>
        <Segmente
          options={[
            { cle: 'lundi', label: 'Lundi' },
            { cle: 'dimanche', label: 'Dimanche' },
          ]}
          valeur={settings.debutSemaine ?? 'lundi'}
          onChange={setDebutSemaine}
        />
      </Carte>

      <Carte
        titre="Données"
        hint="Le journal détaillé au-delà de cette durée est supprimé."
      >
        <Text style={styles.label}>Rétention de l'historique</Text>
        <Segmente
          options={RETENTIONS_POSSIBLES.map(j => ({
            cle: j,
            label: j >= 365 ? '1 an' : `${j} j`,
          }))}
          valeur={retention}
          onChange={setRetentionJours}
        />

        <TouchableOpacity
          style={styles.boutonDanger}
          onPress={confirmerEffacement}
        >
          <Text style={styles.boutonDangerTxt}>
            Effacer l'historique et les statistiques
          </Text>
        </TouchableOpacity>
      </Carte>

      <Carte titre="À propos">
        <Text style={styles.aPropos}>
          VTC Compagnon v0.1.0{'\n'}
          Assistant personnel pour chauffeurs VTC
        </Text>
      </Carte>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COULEURS.fond,
    padding: 16,
  },
  contenu: {
    paddingBottom: 32,
  },
  titre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COULEURS.texte,
    marginBottom: 16,
  },
  carte: {
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  carteTitre: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: COULEURS.accentClair,
    textTransform: 'uppercase',
  },
  carteHint: {
    fontSize: 12,
    color: COULEURS.texteFaible,
    marginTop: 6,
    lineHeight: 17,
  },
  champ: {
    marginTop: 14,
  },
  label: {
    fontSize: 13,
    color: COULEURS.texteSecondaire,
    marginTop: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COULEURS.fond,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: COULEURS.texte,
    fontSize: 16,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: COULEURS.fond,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
  },
  segmentBtnActif: {
    backgroundColor: COULEURS.accent,
  },
  segmentTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: COULEURS.texteSecondaire,
  },
  segmentTxtActif: {
    color: COULEURS.surAccent,
  },
  boutonDanger: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: COULEURS.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  boutonDangerTxt: {
    color: COULEURS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  aPropos: {
    fontSize: 14,
    color: COULEURS.texteSecondaire,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
});
