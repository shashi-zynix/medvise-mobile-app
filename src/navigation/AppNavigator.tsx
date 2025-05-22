import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View} from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import TranscribeScreen from '../screens/TranscribeScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import Header from '../components/Header';
import {useSidebar} from '../context/SidebarContext';
import {useOnboarding} from '../context/OnboardingContext';

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Home: undefined;
  ForgotPassword: undefined;
  Transcribe: {
    patientInfo?: {
      name: string;
      age: string;
      gender: string;
      mrn: string;
    };
    appointmentId?: string;
    recordId?: string;
  };
  Appointments: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const {toggleSidebar} = useSidebar();
  const {hasCompletedOnboarding, isLoading} = useOnboarding();

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#00A651" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={hasCompletedOnboarding ? 'Login' : 'Onboarding'}>
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            header: () => <Header onMenuPress={toggleSidebar} />,
          }}
        />
        <Stack.Screen
          name="Transcribe"
          component={TranscribeScreen}
          options={{headerShown: false}}
        />
        <Stack.Screen
          name="Appointments"
          component={AppointmentScreen}
          options={{headerShown: false}}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
