import React, { useState, useRef } from 'react';
import { View, StyleSheet, FlatList, Dimensions, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import WelcomeScreen from './WelcomeScreen';
import AudioRecordingScreen from './AudioRecordingScreen';
import SoapNotesScreen from './SoapNotesScreen';
import AppointmentsScreen from './AppointmentsScreen';
import FinalScreen from './FinalScreen';
import { Colors } from '../../theme/Colors';
import { useOnboarding } from '../../context/OnboardingContext';

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ navigation }: OnboardingScreenProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { setHasCompletedOnboarding } = useOnboarding();

  const onboardingScreens = [
    { id: '1', component: WelcomeScreen },
    { id: '2', component: AudioRecordingScreen },
    { id: '3', component: SoapNotesScreen },
    { id: '4', component: AppointmentsScreen },
    { id: '5', component: FinalScreen },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingScreens.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      // Mark onboarding as completed and navigate to login screen
      setHasCompletedOnboarding(true);
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    // Mark onboarding as completed and navigate to login screen
    setHasCompletedOnboarding(true);
    navigation.replace('Login');
  };

  const handleViewableItemsChanged = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  };

  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {onboardingScreens.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex ? styles.paginationDotActive : null,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const ScreenComponent = item.component;
    const isLastScreen = index === onboardingScreens.length - 1;

    return (
      <View style={styles.slide}>
        <ScreenComponent
          onNext={handleNext}
          onSkip={handleSkip}
          isLastScreen={isLastScreen}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingScreens}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
      
      {currentIndex !== onboardingScreens.length - 1 && (
        <View style={styles.bottomContainer}>
          {renderPaginationDots()}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>SKIP</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextButtonText}>NEXT</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width,
    flex: 1,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4C4C4',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#00A651',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  skipButton: {
    paddingVertical: 10,
  },
  nextButton: {
    backgroundColor: '#00A651',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  skipButtonText: {
    color: '#9E9E9E',
    fontWeight: '600',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default OnboardingScreen;