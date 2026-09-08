import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EtatCourse } from '../../types';
import { COULEURS_ETAT, TEXTES_ETAT } from '../../constants';

interface WidgetBadgeProps {
  etat: EtatCourse;
}

export const WidgetBadge: React.FC<WidgetBadgeProps> = ({ etat }) => {
  return (
    <View style={[styles.badge, { backgroundColor: COULEURS_ETAT[etat] }]}>
      <Text style={styles.texte}>{TEXTES_ETAT[etat]}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'center',
  },
  texte: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
});
