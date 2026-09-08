import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHistoryStore, useSettingsStore } from '../store';
import { COULEURS } from '../constants';
import {
  formaterTemps,
  formaterArgent,
  formaterDate,
  formaterHeure,
  getDateJour,
} from '../utils/formatters';
import {
  Periode,
  AgregatJour,
  agregerParJour,
  agregatPeriode,
  bornesPeriode,
  decalerPeriode,
  libellePeriode,
  grouperParDate,
} from '../utils/historique';

const PERIODES: { cle: Periode; label: string }[] = [
  { cle: 'jour', label: 'Jour' },
  { cle: 'semaine', label: 'Semaine' },
  { cle: 'mois', label: 'Mois' },
];

const LETTRES_JOUR_LUNDI = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const LETTRES_JOUR_DIMANCHE = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const courses = useHistoryStore(s => s.courses);
  const sessions = useHistoryStore(s => s.sessions);
  const agregatsLegacy = useHistoryStore(s => s.agregatsLegacy);
  const logDepuis = useHistoryStore(s => s.logDepuis);
  const objectif = useSettingsStore(s => s.settings.objectifJournalier);
  const debutSemaineReglage = useSettingsStore(s => s.settings.debutSemaine);
  const premierJour: 0 | 1 = debutSemaineReglage === 'dimanche' ? 0 : 1;
  const lettresJour =
    premierJour === 0 ? LETTRES_JOUR_DIMANCHE : LETTRES_JOUR_LUNDI;

  const [periode, setPeriode] = useState<Periode>('jour');
  const [ancre, setAncre] = useState(getDateJour());
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);

  const aujourdhui = getDateJour();
  const { debut, fin } = useMemo(
    () => bornesPeriode(periode, ancre, premierJour),
    [periode, ancre, premierJour],
  );

  const parJour = useMemo(
    () => agregerParJour(courses, sessions, agregatsLegacy, logDepuis),
    [courses, sessions, agregatsLegacy, logDepuis],
  );
  const agregat = useMemo(
    () => agregatPeriode(parJour, periode, debut, fin),
    [parJour, periode, debut, fin],
  );
  const coursesParJour = useMemo(() => grouperParDate(courses), [courses]);
  const sessionsParJour = useMemo(() => grouperParDate(sessions), [sessions]);

  const libelle = libellePeriode(periode, debut, fin, aujourdhui);
  const peutAvancer = fin < aujourdhui;

  const joursActifs = useMemo(
    () =>
      agregat.jours
        .filter(j => j.nbCourses > 0 || j.tempsService > 0)
        .slice()
        .reverse(),
    [agregat],
  );

  const changerPeriode = (p: Periode) => {
    setPeriode(p);
    setAncre(aujourdhui);
    setJourOuvert(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contenu, { paddingTop: insets.top }]}
    >
      <Text style={styles.titre}>Historique</Text>

      {/* Sélecteur de période */}
      <View style={styles.segment}>
        {PERIODES.map(p => {
          const actif = p.cle === periode;
          return (
            <TouchableOpacity
              key={p.cle}
              onPress={() => changerPeriode(p.cle)}
              style={[styles.segmentBtn, actif && styles.segmentBtnActif]}
            >
              <Text
                style={[
                  styles.segmentTxt,
                  actif && styles.segmentTxtActif,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.nav}>
        <TouchableOpacity
          onPress={() =>
            setAncre(a => decalerPeriode(periode, a, -1, premierJour))
          }
          style={styles.navBtn}
        >
          <Text style={styles.navFleche}>◄</Text>
        </TouchableOpacity>
        <Text style={styles.navLabel}>{libelle}</Text>
        <TouchableOpacity
          disabled={!peutAvancer}
          onPress={() =>
            setAncre(a => decalerPeriode(periode, a, 1, premierJour))
          }
          style={styles.navBtn}
        >
          <Text style={[styles.navFleche, !peutAvancer && styles.navFlecheOff]}>
            ►
          </Text>
        </TouchableOpacity>
      </View>

      {/* Métriques clés */}
      <View style={styles.grille}>
        <Tuile valeur={formaterArgent(agregat.revenu)} label="Revenu" accent />
        <Tuile valeur={String(agregat.nbCourses)} label="Courses" />
        <Tuile
          valeur={formaterTemps(agregat.tempsConduite)}
          label="Conduite"
        />
        <Tuile
          valeur={
            agregat.revenuParHeure > 0
              ? `${formaterArgent(agregat.revenuParHeure)}/h`
              : '—'
          }
          label="Revenu horaire"
        />
        <Tuile
          valeur={
            agregat.efficacite > 0
              ? `${Math.round(agregat.efficacite * 100)} %`
              : '—'
          }
          label="Efficacité"
        />
        <Tuile
          valeur={
            agregat.nbCourses > 0
              ? formaterArgent(agregat.revenuMoyenCourse)
              : '—'
          }
          label="Moy. / course"
        />
      </View>

      {agregat.meilleurJour && periode !== 'jour' && (
        <View style={styles.meilleur}>
          <Text style={styles.meilleurLabel}>Meilleur jour</Text>
          <Text style={styles.meilleurValeur}>
            {formaterDate(agregat.meilleurJour.date)} ·{' '}
            {formaterArgent(agregat.meilleurJour.revenu)}
          </Text>
        </View>
      )}

      {/* Graphe */}
      {periode !== 'jour' && (
        <GrapheBarres
          jours={agregat.jours}
          periode={periode}
          objectif={objectif}
          lettresJour={lettresJour}
        />
      )}

      {/* Détail par jour */}
      <Text style={styles.sousTitre}>Détail</Text>
      {joursActifs.length === 0 ? (
        <Text style={styles.vide}>Aucune activité sur cette période</Text>
      ) : (
        joursActifs.map(j => (
          <LigneJour
            key={j.date}
            jour={j}
            ouvert={jourOuvert === j.date}
            onPress={() =>
              setJourOuvert(cur => (cur === j.date ? null : j.date))
            }
            courses={coursesParJour.get(j.date) ?? []}
            sessions={sessionsParJour.get(j.date) ?? []}
          />
        ))
      )}
    </ScrollView>
  );
};

// --- sous-composants ---

const Tuile: React.FC<{ valeur: string; label: string; accent?: boolean }> = ({
  valeur,
  label,
  accent,
}) => (
  <View style={styles.tuile}>
    <Text
      style={[styles.tuileValeur, accent && styles.tuileValeurAccent]}
      numberOfLines={1}
      adjustsFontSizeToFit
    >
      {valeur}
    </Text>
    <Text style={styles.tuileLabel}>{label}</Text>
  </View>
);

const GrapheBarres: React.FC<{
  jours: AgregatJour[];
  periode: Periode;
  objectif?: number;
  lettresJour: string[];
}> = ({ jours, periode, objectif, lettresJour }) => {
  const max = Math.max(...jours.map(j => j.revenu), objectif ?? 0, 1);

  return (
    <View style={styles.graphe}>
      {objectif ? (
        <Text style={styles.grapheObjectif}>
          Objectif {formaterArgent(objectif)}/jour
        </Text>
      ) : null}
      <View style={styles.grapheBarres}>
        {jours.map((j, i) => {
          const h = (j.revenu / max) * 96;
          const atteint = objectif ? j.revenu >= objectif : false;
          return (
            <View key={j.date} style={styles.grapheColonne}>
              <View
                style={[
                  styles.barre,
                  {
                    height: Math.max(j.revenu > 0 ? 3 : 0, h),
                    backgroundColor: atteint
                      ? COULEURS.positif
                      : COULEURS.accent,
                  },
                ]}
              />
              <Text style={styles.grapheLabel} numberOfLines={1}>
                {periode === 'semaine'
                  ? lettresJour[i]
                  : i % 5 === 0
                    ? String(i + 1)
                    : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const LigneJour: React.FC<{
  jour: AgregatJour;
  ouvert: boolean;
  onPress: () => void;
  courses: { id: string; debut: number; duree: number; revenu: number }[];
  sessions: { id: string; tempsService: number; tempsPause: number }[];
}> = ({ jour, ouvert, onPress, courses, sessions }) => (
  <View style={styles.carteJour}>
    <TouchableOpacity onPress={onPress} style={styles.jourEntete}>
      <Text style={styles.jourDate}>{formaterDate(jour.date)}</Text>
      <Text style={styles.jourResume}>
        {jour.nbCourses} c · {formaterTemps(jour.tempsConduite)} ·{' '}
        {formaterArgent(jour.revenu)}
      </Text>
    </TouchableOpacity>

    {ouvert && (
      <View style={styles.jourDetail}>
        {courses.length === 0 && sessions.length === 0 && (
          <Text style={styles.detailVide}>Pas de détail enregistré</Text>
        )}
        {courses
          .slice()
          .sort((a, b) => a.debut - b.debut)
          .map(c => (
            <View key={c.id} style={styles.detailLigne}>
              <Text style={styles.detailHeure}>{formaterHeure(c.debut)}</Text>
              <Text style={styles.detailTexte}>
                course · {formaterTemps(c.duree)}
              </Text>
              <Text style={styles.detailRevenu}>
                {formaterArgent(c.revenu)}
              </Text>
            </View>
          ))}
        {sessions.map(s => (
          <View key={s.id} style={styles.detailLigne}>
            <Text style={styles.detailHeure}>⏱</Text>
            <Text style={styles.detailTexte}>
              service {formaterTemps(s.tempsService)}
            </Text>
            <Text style={styles.detailPause}>
              pauses {formaterTemps(s.tempsPause)}
            </Text>
          </View>
        ))}
      </View>
    )}
  </View>
);

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
  segment: {
    flexDirection: 'row',
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 18,
  },
  navBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  navFleche: {
    fontSize: 16,
    color: COULEURS.accentClair,
    fontWeight: '800',
  },
  navFlecheOff: {
    color: COULEURS.carteBordure,
  },
  navLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COULEURS.texte,
  },
  grille: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tuile: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  tuileValeur: {
    fontSize: 18,
    fontWeight: '800',
    color: COULEURS.texte,
  },
  tuileValeurAccent: {
    color: COULEURS.positif,
  },
  tuileLabel: {
    fontSize: 11,
    color: COULEURS.texteFaible,
    marginTop: 4,
  },
  meilleur: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 12,
  },
  meilleurLabel: {
    fontSize: 12,
    color: COULEURS.texteFaible,
  },
  meilleurValeur: {
    fontSize: 13,
    fontWeight: '700',
    color: COULEURS.texte,
  },
  graphe: {
    marginTop: 18,
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 14,
    padding: 14,
  },
  grapheObjectif: {
    fontSize: 11,
    color: COULEURS.texteFaible,
    marginBottom: 10,
  },
  grapheBarres: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 116,
    gap: 4,
  },
  grapheColonne: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barre: {
    width: '78%',
    borderRadius: 3,
  },
  grapheLabel: {
    fontSize: 9,
    color: COULEURS.texteFaible,
    marginTop: 5,
  },
  sousTitre: {
    fontSize: 16,
    fontWeight: '800',
    color: COULEURS.texte,
    marginTop: 24,
    marginBottom: 10,
  },
  vide: {
    color: COULEURS.texteFaible,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  carteJour: {
    backgroundColor: COULEURS.carte,
    borderWidth: 1,
    borderColor: COULEURS.carteBordure,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  jourEntete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  jourDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COULEURS.texte,
  },
  jourResume: {
    fontSize: 12,
    color: COULEURS.texteSecondaire,
  },
  jourDetail: {
    borderTopWidth: 1,
    borderTopColor: COULEURS.separateur,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailVide: {
    fontSize: 12,
    color: COULEURS.texteFaible,
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  detailLigne: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 10,
  },
  detailHeure: {
    fontSize: 12,
    color: COULEURS.texteFaible,
    width: 44,
  },
  detailTexte: {
    flex: 1,
    fontSize: 12,
    color: COULEURS.texteSecondaire,
  },
  detailRevenu: {
    fontSize: 12,
    fontWeight: '700',
    color: COULEURS.positif,
  },
  detailPause: {
    fontSize: 12,
    color: COULEURS.alerte,
  },
});
