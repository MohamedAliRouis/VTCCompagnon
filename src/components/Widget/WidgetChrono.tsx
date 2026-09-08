import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formaterTemps, formaterArgent } from '../../utils/formatters';

interface WidgetChronoProps {
  tempsEcoule: number;
  revenuEstime: number;
}

export const WidgetChrono: React.FC<WidgetChronoProps> = ({ 
  tempsEcoule, 
  revenuEstime 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.chrono}>⏱️ {formaterTemps(tempsEcoule)}</Text>
      <Text style={styles.revenu}>💰 {formaterArgent(revenuEstime)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chrono: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  revenu: {
    fontSize: 14,
    color: '#ffd700',
    marginTop: 4,
  },
});
