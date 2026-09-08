/**
 * VTC Compagnon - Application compagnon pour chauffeurs VTC
 * Navigation principale avec bottom tabs
 */

import React from 'react';
import { StatusBar, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen, HistoryScreen, SettingsScreen } from './src/screens';
import {
  useCourseTimer,
  useSessionTimer,
  useWidgetOverlay,
} from './src/hooks';

const Tab = createBottomTabNavigator();

// Composants d'icônes avec Text pour éviter l'erreur "Text strings..."
const AccueilIcon = () => <Text style={styles.icon}>🚗</Text>;
const HistoriqueIcon = () => <Text style={styles.icon}>📊</Text>;
const ReglagesIcon = () => <Text style={styles.icon}>⚙️</Text>;

function App() {
  useCourseTimer();
  useSessionTimer();
  useWidgetOverlay(true);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#1a1a2e',
              borderTopColor: 'rgba(255,255,255,0.1)',
            },
            tabBarActiveTintColor: '#3498db',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
          }}
        >
          <Tab.Screen
            name="Accueil"
            component={HomeScreen}
            options={{
              tabBarIcon: AccueilIcon,
            }}
          />
          <Tab.Screen
            name="Historique"
            component={HistoryScreen}
            options={{
              tabBarIcon: HistoriqueIcon,
            }}
          />
          <Tab.Screen
            name="Réglages"
            component={SettingsScreen}
            options={{
              tabBarIcon: ReglagesIcon,
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 20,
  },
});

export default App;
