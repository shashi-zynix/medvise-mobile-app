import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  PermissionsAndroid,
  Linking,
  Image,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Voice from '@react-native-voice/voice';
import {RootStackParamList} from '../navigation/AppNavigator';
import {Colors} from '../theme/Colors';
import {useSidebar} from '../context/SidebarContext';
import logger from '../utils/logger';
import {showSuccessToast, showErrorToast, showInfoToast} from '../utils/toastUtils';
import Header from '../components/Header';

interface TestAudioScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TestAudio'>;
}

const TestAudioScreen = ({navigation}: TestAudioScreenProps) => {
  // State variables
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [partialResults, setPartialResults] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [pitch, setPitch] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const {isSidebarOpen} = useSidebar();

  // Set up Voice listeners
  useEffect(() => {
    // Initialize Voice
    initializeVoice();

    // Cleanup
    return () => {
      destroyVoice();
    };
  }, []);

  const initializeVoice = () => {
    // Add event listeners
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechVolumeChanged = onSpeechVolumeChanged;
    
    // Get available voices
    checkAvailableVoices();
  };

  const destroyVoice = async () => {
    try {
      await Voice.destroy();
      
      // Remove listeners
      Voice.onSpeechStart = () => {};
      Voice.onSpeechEnd = () => {};
      Voice.onSpeechError = () => {};
      Voice.onSpeechResults = () => {};
      Voice.onSpeechPartialResults = () => {};
      Voice.onSpeechVolumeChanged = () => {};
      
      // Reset states
      setPitch('');
      setError('');
      setRecognizedText('');
      setPartialResults([]);
      setIsListening(false);
    } catch (e) {
      logger.error('Error destroying Voice instance', {
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  };

  const checkAvailableVoices = async () => {
    try {
      const isAvailable = await Voice.isAvailable();
      if (isAvailable) {
        const voices = await Voice.getSpeechRecognitionServices();
        if (voices && voices.length > 0) {
          setAvailableVoices(voices);
        }
      } else {
        setError('Voice recognition is not available on this device');
      }
    } catch (e) {
      setError('Error checking voice availability');
    }
  };

  // Voice event handlers
  const onSpeechStart = (e: any) => {
    logger.info('Speech started', e);
    setIsListening(true);
  };

  const onSpeechEnd = (e: any) => {
    logger.info('Speech ended', e);
    setIsListening(false);
  };

  const onSpeechError = (e: any) => {
    logger.error('Speech recognition error', e);
    setError(JSON.stringify(e.error));
    setIsListening(false);
  };

  const onSpeechResults = (e: any) => {
    logger.info('Speech results', e);
    if (e.value && e.value.length > 0) {
      setRecognizedText(e.value[0]);
    }
  };

  const onSpeechPartialResults = (e: any) => {
    logger.info('Partial results', e);
    if (e.value && e.value.length > 0) {
      setPartialResults(e.value);
    }
  };

  const onSpeechVolumeChanged = (e: any) => {
    setPitch(e.value);
  };

  // Request microphone permissions
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'App needs access to your microphone for voice recognition',
            buttonPositive: 'Grant',
            buttonNegative: 'Deny',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        logger.error('Error requesting microphone permission', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        return false;
      }
    } else {
      // iOS handles permissions differently
      return true;
    }
  };

  // Start voice recognition
  const startListening = async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'This app needs microphone access for speech recognition',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ],
        );
        return;
      }
      
      // Reset previous session
      await Voice.destroy();
      await Voice.start('en-US');
      
      // Clear previous results
      setRecognizedText('');
      setPartialResults([]);
      setError('');
      showInfoToast('Listening Started', 'Speak now...');
    } catch (e) {
      logger.error('Error starting voice recognition', {
        error: e instanceof Error ? e.message : 'Unknown error',
      });
      setError('Error starting voice recognition');
      showErrorToast('Error', 'Failed to start voice recognition');
    }
  };

  // Stop voice recognition
  const stopListening = async () => {
    try {
      await Voice.stop();
      showSuccessToast('Listening Stopped', 'Speech recognition completed');
    } catch (e) {
      logger.error('Error stopping voice recognition', {
        error: e instanceof Error ? e.message : 'Unknown error',
      });
      setError('Error stopping voice recognition');
      showErrorToast('Error', 'Failed to stop voice recognition');
    }
  };

  // Scroll to bottom of text when results change
  useEffect(() => {
    if (recognizedText && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [recognizedText]);

  return (
    <SafeAreaView style={styles.container}>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        {/* Voice recognition status section */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.labelText}>Voice Recognition:</Text>
            <View
              style={[
                styles.statusIndicator,
                {backgroundColor: isListening ? '#4CAF50' : '#F44336'},
              ]}>
              <Text style={styles.statusText}>
                {isListening ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Error:</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </View>

        {/* Voice information section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Voice Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.labelText}>Available Services:</Text>
            <Text style={styles.valueText}>{availableVoices.length}</Text>
          </View>
          {pitch !== '' && (
            <View style={styles.infoRow}>
              <Text style={styles.labelText}>Pitch:</Text>
              <Text style={styles.valueText}>{pitch}</Text>
            </View>
          )}
        </View>

        {/* Partial results section */}
        {partialResults.length > 0 && (
          <View style={styles.partialResultsSection}>
            <Text style={styles.sectionTitle}>Partial Results</Text>
            {partialResults.map((result, index) => (
              <Text key={`partial-${index}`} style={styles.partialResultText}>
                {result}
              </Text>
            ))}
          </View>
        )}

        {/* Recognized text section */}
        <View style={styles.recognizedTextSection}>
          <Text style={styles.sectionTitle}>Recognized Text</Text>
          <View style={styles.textContainer}>
            <Text style={styles.recognizedText}>
              {recognizedText || 'No text recognized yet. Press start to begin.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Control buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.startButton, isListening && styles.disabledButton]}
          onPress={startListening}
          disabled={isListening}>
          <Image
            source={require('../assets/start.png')}
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.stopButton, !isListening && styles.disabledButton]}
          onPress={stopListening}
          disabled={!isListening}>
          <Image
            source={require('../assets/pause.png')}
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>Stop</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  partialResultsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recognizedTextSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: Colors.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#616161',
  },
  valueText: {
    fontSize: 16,
    color: '#212121',
  },
  textContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  recognizedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#212121',
  },
  partialResultText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '45%',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  errorContainer: {
    marginTop: 12,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorTitle: {
    color: '#D32F2F',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorText: {
    color: '#D32F2F',
  },
});

export default TestAudioScreen;
