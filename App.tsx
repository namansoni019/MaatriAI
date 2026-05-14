import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, TouchableOpacity, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { initDatabase } from './src/database/db';
import { loadSavedLanguage } from './src/services/languageService';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useTranslation } from 'react-i18next';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import OnboardingScreen from './src/screens/auth/OnboardingScreen';

// Dashboard
import HomeScreen from './src/screens/dashboard/HomeScreen';
import ProfileScreen from './src/screens/auth/ProfileScreen';

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

const MotherNavigator = () => {
  const { t } = useTranslation();
  return (
    <MotherStack.Navigator screenOptions={defaultHeaderOptions}>
      <MotherStack.Screen 
        name="MotherList" 
        component={MotherListScreen} 
        options={{ title: t('app.myMothers') }} 
      />
      <MotherStack.Screen 
        name="MotherProfile" 
        component={MotherProfileScreen} 
        options={({ route }) => ({ title: route.params.motherName })} 
      />
      <MotherStack.Screen 
        name="AddMother" 
        component={AddMotherScreen} 
        options={({ navigation, route }: any) => ({ 
          title: t('app.addMother'),
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (route.params?.fromHome) {
                  navigation.navigate('Home');
                } else {
                  navigation.goBack();
                }
              }} 
              style={{ marginLeft: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        })} 
      />
      <MotherStack.Screen 
        name="StartVisit" 
        component={StartVisitScreen} 
        options={{ title: t('app.homeVisit') }} 
      />
      <MotherStack.Screen 
        name="RiskScore" 
        component={RiskScoreScreen} 
        options={{ title: t('app.riskScore') }} 
      />
      <MotherStack.Screen 
        name="DangerSign" 
        component={DangerSignScreen} 
        options={{ title: t('app.alert') }} 
      />
      <MotherStack.Screen 
        name="VisitSummary" 
        component={VisitSummaryScreen} 
        options={{ title: t('app.visitSummary') }} 
      />
      <MotherStack.Screen 
        name="NewbornProfile" 
        component={NewbornProfileScreen} 
        options={{ title: t('app.newborn') }} 
      />
      <MotherStack.Screen 
        name="VisionScan" 
        component={VisionScanScreen} 
        options={{ title: t('app.newbornScan') }} 
      />
      <MotherStack.Screen 
        name="BreathScan" 
        component={BreathScanScreen} 
        options={{ title: t('app.breathCheck') }} 
      />
      <MotherStack.Screen 
        name="EPDS" 
        component={EPDSScreen} 
        options={{ title: t('app.mentalHealth') }} 
      />
    </MotherStack.Navigator>
  );
};
const MainNavigator = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, focused }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Mothers') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'Sync') iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person-circle' : 'person-circle-outline';

          return <Ionicons name={iconName} size={24} color={color} style={{ marginTop: 4 }} />;
        },
        tabBarLabel: ({ focused, color }) => {
          let labelStr = '';
          if (route.name === 'Home') labelStr = t('app.tabHome');
          else if (route.name === 'Mothers') labelStr = t('app.tabMothers');
          else if (route.name === 'Sync') labelStr = t('app.tabSync');
          else if (route.name === 'Profile') labelStr = t('app.tabProfile');

          return (
            <Text style={{ color, fontSize: 11, fontWeight: focused ? 'bold' : 'normal', marginBottom: 4 }}>
              {labelStr}
            </Text>
          );
        },
        tabBarActiveTintColor: '#C2185B',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: { 
          backgroundColor: '#FFFFFF',
          height: 60, 
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Mothers" component={MotherNavigator} />
      <Tab.Screen name="Sync" component={SyncScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

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
        await loadSavedLanguage();
        await initDatabase();
        const session = await AsyncStorage.getItem('maatri_session');
        if (session) {
          setHasSession(true);
        }
      } catch (error) {
        console.error(error);
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
    <ErrorBoundary>
      <AuthContext.Provider value={authContext}>
        <NavigationContainer>
          {hasSession ? <MainNavigator /> : <AuthNavigator />}
        </NavigationContainer>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}
