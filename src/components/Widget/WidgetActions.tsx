import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EtatCourse } from '../../types';
import { TEXTES_BOUTON_PRINCIPAL, TEXTES_BOUTON_SECONDAIRE } from '../../constants';

interface WidgetActionsProps {
  etat: EtatCourse;
  onActionPrincipale: () => void;
  onActionSecondaire: () => void;
}

export const WidgetActions: React.FC<WidgetActionsProps> = ({
  etat,
  onActionPrincipale,
  onActionSecondaire,
}) => {
  const textePrincipal = TEXTES_BOUTON_PRINCIPAL[etat] || '▶ DÉMARRER';
  const texteSecondaire = TEXTES_BOUTON_SECONDAIRE[etat] || '';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.boutonPrincipal}
        onPress={onActionPrincipale}
      >
        <Text style={styles.texteBouton}>{textePrincipal}</Text>
      </TouchableOpacity>

      {etat !== 'REPOS' && texteSecondaire !== '' && (
        <TouchableOpacity
          style={styles.boutonSecondaire}
          onPress={onActionSecondaire}
        >
          <Text style={styles.texteBoutonSecondaire}>{texteSecondaire}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  boutonPrincipal: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  texteBouton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  boutonSecondaire: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  texteBoutonSecondaire: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    fontSize: 11,
  },
});
