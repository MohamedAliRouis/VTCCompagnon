import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { WidgetFlottant } from '../components/Widget';
import { StatsModal } from '../components/Stats';
import { useCourseStore, useStatsStore, useSettingsStore } from '../store';

export const HomeScreen: React.FC = () => {
  const [modalStatsVisible, setModalStatsVisible] = useState(false);
  
  const { chargerDepuisStockage } = useCourseStore();
  const { chargerStats } = useStatsStore();
  const { chargerSettings } = useSettingsStore();

  // Chargement initial
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        chargerDepuisStockage(),
        chargerStats(),
        chargerSettings(),
      ]);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.background} />
      
      <WidgetFlottant onStatsPress={() => setModalStatsVisible(true)} />
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalStatsVisible}
        onRequestClose={() => setModalStatsVisible(false)}
      >
        <StatsModal onClose={() => setModalStatsVisible(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
  },
});
