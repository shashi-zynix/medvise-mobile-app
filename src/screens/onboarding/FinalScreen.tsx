import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Button from '../../components/Button';
import { useOnboarding } from '../../context/OnboardingContext';

type FinalScreenProps = {
  onNext: () => void;
  onSkip: () => void;
  isLastScreen: boolean;
};

const FinalScreen = ({ onNext }: FinalScreenProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { setHasCompletedOnboarding } = useOnboarding();

  const handleLogin = () => {
    setHasCompletedOnboarding(true);
    navigation.replace('Login');
  };

  const handleSignUp = () => {
    // Mark onboarding as completed
    setHasCompletedOnboarding(true);
    // Navigate to sign up screen when implemented
    // For now, just go to login
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Continue Your Medvise Journey</Text>
        
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/final-screen.png')}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
        
        <Text style={styles.description}>
          Log in or create an account to manage patients, record sessions, and simplify your workflow.
        </Text>
        
        <View style={styles.buttonContainer}>
          <Button
            title="LOGIN"
            onPress={handleLogin}
            style={styles.loginButton}
          />
          
          <Button
            title="SIGN UP"
            onPress={handleSignUp}
            variant="outline"
            style={styles.signUpButton}
            textStyle={{ color: '#00A651' }}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2FFF6',
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#00A651',
    textAlign: 'center',
  },
  imageContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  image: {
    width: 250,
    height: 300,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4A4A4A',
    lineHeight: 24,
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 20,
  },
  loginButton: {
    marginBottom: 15,
    backgroundColor: '#00A651',
    height: 50,
  },
  signUpButton: {
    height: 50,
    borderColor: '#00A651',
  },
});

export default FinalScreen;