import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  Switch,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useSettingsStore } from '../store';
import { useWidgetOverlay } from '../hooks/useWidgetOverlay';

export const SettingsScreen: React.FC = () => {
  const { settings, setTarifs, setTheme, setNotifications } = useSettingsStore();
  const { 
    isSupported, 
    checkPermission, 
    requestPermission, 
    showOverlay, 
    hideOverlay,
    isRunning 
  } = useWidgetOverlay();
  
  const [overlayActif, setOverlayActif] = React.useState(false);
  const [priseEnCharge, setPriseEnCharge] = React.useState(
    settings.tarifs.priseEnCharge.toString()
  );
  const [parMinute, setParMinute] = React.useState(
    settings.tarifs.parMinute.toString()
  );

  // Vérifier l'état de l'overlay au chargement
  React.useEffect(() => {
    const verifierOverlay = async () => {
      if (isSupported) {
        const running = await isRunning();
        setOverlayActif(running);
      }
    };
    verifierOverlay();
  }, [isSupported, isRunning]);

  const toggleOverlay = async (value: boolean) => {
    if (!isSupported) {
      Alert.alert('Non supporté', 'L\'overlay n\'est disponible que sur Android');
      return;
    }

    if (value) {
      // Activer
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission requise',
          'VTC Compagnon a besoin de la permission "Afficher par-dessus les autres applications" pour afficher le widget.',
          [
            { text: 'Annuler', style: 'cancel' },
            { 
              text: 'Autoriser', 
              onPress: async () => {
                await requestPermission();
                // L'utilisateur devra revenir activer le toggle après avoir accordé la permission
              }
            }
          ]
        );
        return;
      }
      
      const success = await showOverlay();
      if (success) {
        setOverlayActif(true);
        Alert.alert('Succès', 'Widget overlay activé !');
      } else {
        Alert.alert('Erreur', 'Impossible d\'activer le widget');
      }
    } else {
      // Désactiver
      await hideOverlay();
      setOverlayActif(false);
    }
  };

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

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titre}>⚙️ Paramètres</Text>

      {/* Widget Overlay */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Widget flottant</Text>
        
        <View style={styles.option}>
          <View style={styles.optionTexte}>
            <Text style={styles.labelOption}>Widget overlay</Text>
            <Text style={styles.descriptionOption}>
              Affiche le widget par-dessus les autres applications
            </Text>
          </View>
          <Switch
            value={overlayActif}
            onValueChange={toggleOverlay}
            trackColor={{ false: '#767577', true: '#3498db' }}
            thumbColor={overlayActif ? '#fff' : '#f4f3f4'}
            disabled={!isSupported}
          />
        </View>
        
        {!isSupported && (
          <Text style={styles.noteOption}>
            ⚠️ Disponible uniquement sur Android
          </Text>
        )}
      </View>

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
            placeholderTextColor="rgba(255,255,255,0.3)"
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
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
        </View>

        <TouchableOpacity style={styles.bouton} onPress={sauvegarderTarifs}>
          <Text style={styles.texteBouton}>Sauvegarder les tarifs</Text>
        </TouchableOpacity>
      </View>

      {/* Préférences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitre}>Préférences</Text>
        
        <View style={styles.option}>
          <Text style={styles.labelOption}>Notifications</Text>
          <Switch
            value={settings.notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#767577', true: '#3498db' }}
            thumbColor={settings.notifications ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={styles.option}>
          <Text style={styles.labelOption}>Thème sombre</Text>
          <Switch
            value={settings.theme === 'dark'}
            onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
            trackColor={{ false: '#767577', true: '#3498db' }}
            thumbColor={settings.theme === 'dark' ? '#fff' : '#f4f3f4'}
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
    marginBottom: 12,
  },
  champ: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  bouton: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  texteBouton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionTexte: {
    flex: 1,
    marginRight: 12,
  },
  labelOption: {
    fontSize: 14,
    color: '#fff',
  },
  descriptionOption: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  noteOption: {
    fontSize: 11,
    color: '#f39c12',
    marginTop: 8,
    fontStyle: 'italic',
  },
  carte: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
  },
  texteAPropos: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
});
