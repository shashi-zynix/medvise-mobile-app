import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

type WelcomeScreenProps = {
  onNext: () => void;
  onSkip: () => void;
  isLastScreen: boolean;
};

const WelcomeScreen = ({ onNext, onSkip, isLastScreen }: WelcomeScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/welcome.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>Welcome to Medvise</Text>
        <Text style={styles.description}>
          Medvise helps you record patient appointments and automatically generate SOAP notes —
          saving you hours of manual data entry and effort in medical documents.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F2FFF6',
  },
  logoContainer: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  logo: {
    width: 120,
    height: 40,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: '50%',
    marginVertical: 30,
  },
  image: {
    width: 250,
    height: 250,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#00A651',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#4A4A4A',
    lineHeight: 24,
  },
});

export default WelcomeScreen;