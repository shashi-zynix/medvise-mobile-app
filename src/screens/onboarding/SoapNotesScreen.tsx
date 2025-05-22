import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

type SoapNotesScreenProps = {
  onNext: () => void;
  onSkip: () => void;
  isLastScreen: boolean;
};

const SoapNotesScreen = ({ onNext, onSkip, isLastScreen }: SoapNotesScreenProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/soap-notes.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>SOAP Notes, Auto-Generated</Text>
        <Text style={styles.description}>
          Our AI automatically generates complete SOAP notes — saving you hours of manual effort.
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
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    maxHeight: '60%',
    marginVertical: 30,
  },
  image: {
    width: 250,
    height: 300,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
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

export default SoapNotesScreen;