import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from './src/database/db';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';

// Dashboard
import HomeScreen from './src/screens/dashboard/HomeScreen';

// Mother Stack Screens
import MotherListScreen from './src/screens/mother/MotherListScreen';
import MotherProfileScreen from './src/screens/mother/MotherProfileScreen';
import AddMotherScreen from './src/screens/mother/AddMotherScreen';
import StartVisitScreen from './src/screens/visit/StartVisitScreen';
import RiskScoreScreen from './src/screens/visit/RiskScoreScreen';
import DangerSignScreen from './src/screens/visit/DangerSignScreen';
import VisitSummaryScreen from './src/screens/visit/VisitSummaryScreen';
import NewbornProfileScreen from './src/screens/newborn/NewbornProfileScreen';
import VisionScanScreen from './src/screens/newborn/VisionScanScreen';
import BreathScanScreen from './src/screens/newborn/BreathScanScreen';
import EPDSScreen from './src/screens/mentalhealth/EPDSScreen';

// Sync Screen
import SyncScreen from './src/screens/sync/SyncScreen';

// Types
export type AuthStackParamList = {
  Login: undefined;
  Onboarding: undefined;
};

export type MotherStackParamList = {
  MotherList: undefined;
  MotherProfile: { motherId: string; motherName: string };
  AddMother: undefined;
  StartVisit: { motherId: string };
  RiskScore: { visitId: string };
  DangerSign: { visitId: string };
  VisitSummary: { visitId: string };
  NewbornProfile: { newbornId: string };
  VisionScan: { newbornId: string };
  BreathScan: { newbornId: string };
  EPDS: { motherId: string };
};

export type MainTabParamList = {
  Home: undefined;
  Mothers: undefined; 
  Sync: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const MotherStack = createStackNavigator<MotherStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const themeColors = {
  primary: '#C2185B',
  inactive: '#9E9E9E',
  background: '#FFFFFF',
};

const defaultHeaderOptions = {
  headerStyle: { backgroundColor: themeColors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' as const },
};

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
  </AuthStack.Navigator>
);

const MotherNavigator = () => (
  <MotherStack.Navigator screenOptions={defaultHeaderOptions}>
    <MotherStack.Screen 
      name="MotherList" 
      component={MotherListScreen} 
      options={{ title: 'My Mothers / मेरी माताएं' }} 
    />
    <MotherStack.Screen 
      name="MotherProfile" 
      component={MotherProfileScreen} 
      options={({ route }) => ({ title: route.params.motherName })} 
    />
    <MotherStack.Screen 
      name="AddMother" 
      component={AddMotherScreen} 
      options={{ title: 'Add Mother / माँ जोड़ें' }} 
    />
    <MotherStack.Screen 
      name="StartVisit" 
      component={StartVisitScreen} 
      options={{ title: 'Home Visit / घर की यात्रा' }} 
    />
    <MotherStack.Screen 
      name="RiskScore" 
      component={RiskScoreScreen} 
      options={{ title: 'Risk Score / जोखिम अंक' }} 
    />
    <MotherStack.Screen 
      name="DangerSign" 
      component={DangerSignScreen} 
      options={{ title: 'Alert / चेतावनी' }} 
    />
    <MotherStack.Screen 
      name="VisitSummary" 
      component={VisitSummaryScreen} 
      options={{ title: 'Visit Summary / यात्रा सारांश' }} 
    />
    <MotherStack.Screen 
      name="NewbornProfile" 
      component={NewbornProfileScreen} 
      options={{ title: 'Newborn / नवजात' }} 
    />
    <MotherStack.Screen 
      name="VisionScan" 
      component={VisionScanScreen} 
      options={{ title: 'Newborn Scan / जांच' }} 
    />
    <MotherStack.Screen 
      name="BreathScan" 
      component={BreathScanScreen} 
      options={{ title: 'Breath Check / सांस जांच' }} 
    />
    <MotherStack.Screen 
      name="EPDS" 
      component={EPDSScreen} 
      options={{ title: 'Mental Health / मानसिक स्वास्थ्य' }} 
    />
  </MotherStack.Navigator>
);

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'Mothers') iconName = 'people';
        else if (route.name === 'Sync') iconName = 'cloud-upload';

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: themeColors.primary,
      tabBarInactiveTintColor: themeColors.inactive,
      tabBarStyle: { backgroundColor: themeColors.background },
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
    <Tab.Screen name="Mothers" component={MotherNavigator} options={{ title: 'Mothers' }} />
    <Tab.Screen name="Sync" component={SyncScreen} options={{ title: 'Sync' }} />
  </Tab.Navigator>
);

import { AuthContext } from './src/context/AuthContext';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const authContext = React.useMemo(
    () => ({
      signIn: () => setHasSession(true),
      signOut: () => setHasSession(false),
    }),
    []
  );

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize SQLite Database
        await initDatabase();

        // Check for active session
        const session = await AsyncStorage.getItem('maatri_session');
        setHasSession(!!session);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        {hasSession ? <MainNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
