import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import {PermissionsAndroid} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import Voice from '@react-native-voice/voice';
import {useDispatch} from 'react-redux';
import {AnyAction} from 'redux';
import {ThunkDispatch} from '@reduxjs/toolkit';
import {Colors} from '../theme/Colors';
import Sidebar from '../components/Sidebar';
import TranscriptLoadingModal from '../components/TranscriptLoadingModal';
import {RootStackParamList} from '../navigation/AppNavigator';
import {RouteProp} from '@react-navigation/native';
import {useSidebar} from '../context/SidebarContext';
import {useAppSelector} from '../redux/store';
import logger from '../utils/logger';
import {
  showSuccessToast,
  showErrorToast,
  showInfoToast,
} from '../utils/toastUtils';
import {
  getAudioRecordingSignedUrl,
  transcribeAudioChunkAction,
  uploadToS3Action,
  generateSoapNotesAction,
  setSoapNotePollActive,
  clearSoapNoteData,
} from '../redux/slices/appointmentsSlice';
import useTranscriptionAPI from '../hooks/useTranscriptionAPI';
import {
  SignedUrlResponse,
  SignedUrlRequest,
  TranscribeChunkResponse,
  TranscribeChunkRequest,
} from '../types/apiTypes';
import {encode as btoa} from 'base-64';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import {apiClient} from '../api';
import RNFS from 'react-native-fs';
import RNFetchBlob from 'react-native-blob-util';

interface S3UploadResponse {
  success: boolean;
  message?: string;
  recordId: number;
}

const transcriptLoadingIcon = require('../assets/transcript-loading.png');

type TranscribeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Transcribe'>;
  route: RouteProp<RootStackParamList, 'Transcribe'>;
};

const audioRecorderPlayer = new AudioRecorderPlayer();

const TranscribeScreen = ({navigation, route}: TranscribeScreenProps) => {
  const isDarkMode = false;
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [audioData, setAudioData] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<
    'checking' | 'granted' | 'denied' | 'unknown'
  >('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [recognitionTime, setRecognitionTime] = useState('00:00:00');
  const recognitionTimer = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [loadingModalVisible, setLoadingModalVisible] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);
  const pausedTimeRef = useRef<number>(0);
  const lastSpeechRef = useRef<string>('');
  const stopInProgressRef = useRef<boolean>(false);

  const [recording, setRecording] = useState(false);
  const [audioPath, setAudioPath] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);

  const {
    selectedAppointmentDetail,
    soapNoteGenerationStatus,
    soapNoteData,
    loading,
  } = useAppSelector(state => state.appointments);
  const dispatch = useDispatch<ThunkDispatch<any, undefined, AnyAction>>();

  const appointmentId = route.params?.appointmentId;
  const recordId = route.params?.recordId;
  const {isSidebarOpen} = useSidebar();

  const patientInfo = selectedAppointmentDetail
    ? {
        name: selectedAppointmentDetail.appointment_name || 'No Name',
        age: selectedAppointmentDetail.metadata?.age || '',
        gender: selectedAppointmentDetail.metadata?.sex_at_birth || '',
        mrn: selectedAppointmentDetail.identifier || '',
        uid: selectedAppointmentDetail.identifier || '',
      }
    : route.params?.patientInfo || {
        name: 'George Smith',
        age: '43',
        gender: 'Male',
        mrn: '430897134',
        uid: '430897134',
      };

  const safeDispatch = async <T,>(
    actionCreator: any,
    payload: any,
  ): Promise<T> => {
    try {
      const result = await dispatch(actionCreator(payload));
      return result.payload as T;
    } catch (error) {
      logger.error('Error dispatching action', {
        action: actionCreator.name,
        payload,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      const result = await audioRecorderPlayer.startRecorder();
      setAudioPath(result);
      setRecording(true);

      showInfoToast('Recording Started', 'Audio recording has begun');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to start recording', error);

      showErrorToast(
        'Recording Error',
        `Failed to start recording: ${errorMessage}`,
      );
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      setRecording(false);
      setAudioPath(result);
      logger.info('Recording stopped successfully', {audio_path: result});
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to stop recording', {
        error: errorMessage,
      });

      showErrorToast(
        'Recording Error',
        `Failed to stop recording: ${errorMessage}`,
      );

      return null;
    }
  };

  const playAudio = async () => {
    try {
      await audioRecorderPlayer.startPlayer(audioPath);

      showInfoToast('Audio Playback', 'Playing recorded audio');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.warn('Failed to play audio', error);

      showErrorToast('Playback Error', `Failed to play audio: ${errorMessage}`);
    }
  };

  const transcriptionAPI = useTranscriptionAPI({
    recordId: recordId ? parseInt(recordId, 10) : 0,
    onTranscriptionComplete: result => {
      logger.info('Transcription completed', {result});
      setRecognizedText(result?.text || '');
      // setLoadingModalVisible(false);
    },
    onError: error => {
      logger.error('Transcription error', {error});
      showErrorToast(
        'Transcription Error',
        error?.message || 'Failed to transcribe audio',
      );
      setLoadingModalVisible(false);
    },
  });

  const safelyRemoveVoiceListeners = () => {
    try {
      Voice.removeAllListeners();
    } catch (e: any) {
      logger.warn('Failed to remove Voice listeners', {error: e.message || e});
    }
  };

  const setupVoiceListeners = () => {
    safelyRemoveVoiceListeners();

    logger.info('Setting up Voice listeners');

    Voice.onSpeechStart = () => {
      logger.info('Speech recognition started event');
      if (!isPaused) setIsListening(true);
    };

    Voice.onSpeechEnd = () => {
      logger.info('Speech recognition ended event');
      if (!isPaused) setIsListening(false);
    };

    Voice.onSpeechResults = (event: any) => {
      if (event && event.value && event.value.length > 0) {
        const fullTranscript = event.value[0];
        logger.info('Speech recognition results received', {
          text_length: fullTranscript.length,
          text_preview:
            fullTranscript.substring(0, 50) +
            (fullTranscript.length > 50 ? '...' : ''),
        });

        const prevWords = lastSpeechRef.current
          ? lastSpeechRef.current.split(/\s+/)
          : [];
        const currWords = fullTranscript.split(/\s+/);
        const newWords =
          currWords.length > prevWords.length
            ? currWords.slice(prevWords.length).join(' ')
            : '';
        if (newWords) {
          setRecognizedText(prev => (prev ? `${prev} ${newWords}` : newWords));
        }
        lastSpeechRef.current = fullTranscript;
      } else {
        logger.warn('Received speech results event with no valid values');
      }
    };

    Voice.onSpeechError = (error: any) => {
      logger.error('Speech recognition error', {
        error: error?.error?.message || 'Unknown speech recognition error',
        code: error?.error?.code,
      });

      if (error?.error?.code !== 'cancelled' && error?.error?.code !== '5') {
        Alert.alert(
          'Speech Recognition Error',
          'An error occurred during speech recognition. Please try again.',
        );
      }

      setIsListening(false);
    };
  };

  const requestSpeechPermissions = async (): Promise<boolean> => {
    setPermissionStatus('checking');
    setIsRequestingPermission(true);

    logger.info('Requesting speech recognition permissions', {
      platform: Platform.OS,
      platform_version: Platform.Version,
      component: 'TranscribeScreen',
    });

    if (Platform.OS === 'android') {
      try {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );

        logger.info('Checking existing microphone permission', {
          has_permission: hasPermission,
          android_version: Platform.Version,
        });

        if (hasPermission) {
          logger.info('Microphone permission already granted');
          setPermissionStatus('granted');
          setIsRequestingPermission(false);
          return true;
        }

        logger.info('Explicitly requesting microphone permission...');

        const micPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'This app needs microphone access to record audio for speech recognition',
            buttonNeutral: undefined,
            buttonNegative: 'Deny',
            buttonPositive: 'Allow',
          },
        );

        logger.info('Microphone permission request result', {
          result: micPermission,
          granted: micPermission === PermissionsAndroid.RESULTS.GRANTED,
          denied: micPermission === PermissionsAndroid.RESULTS.DENIED,
          never_ask_again:
            micPermission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
        });

        if (micPermission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          logger.warn(
            'User selected never ask again for microphone permission',
          );
          setPermissionStatus('denied');
          setIsRequestingPermission(false);

          Alert.alert(
            'Microphone Access Required',
            "You've previously denied microphone access. Please enable it in app settings to use speech recognition.",
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
            ],
          );
          return false;
        }

        if (micPermission !== PermissionsAndroid.RESULTS.GRANTED) {
          logger.warn('Microphone permission denied');
          setPermissionStatus('denied');
          setIsRequestingPermission(false);

          Alert.alert(
            'Microphone Permission Required',
            'Speech recognition requires microphone access. Please try again and tap "Allow" on the permission request.',
            [{text: 'OK', style: 'default'}],
          );
          return false;
        }

        logger.info('Microphone permission granted successfully');
        setPermissionStatus('granted');
        setIsRequestingPermission(false);
        return true;
      } catch (error) {
        logger.error('Permission request failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        Alert.alert(
          'Permission Error',
          'There was a problem requesting microphone permissions. Please restart the app and try again.',
        );
        return false;
      }
    } else {
      logger.info('iOS permissions will be handled by the Voice library');
      setPermissionStatus('granted');
      setIsRequestingPermission(false);
      return true;
    }
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const formattedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${formattedMinutes}:${formattedSeconds}`;
  };

  useEffect(() => {
    if (recognizedText && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({animated: true});
      }, 100);
    }
  }, [recognizedText]);

  useEffect(() => {
    setupVoiceListeners();

    const checkDeviceCompatibility = async () => {
      try {
        const isAvailable = await Voice.isAvailable();
        if (!isAvailable) {
          logger.warn('Speech recognition is not available on this device');
          Alert.alert(
            'Not Supported',
            'Speech recognition is not supported on this device',
          );
        }
      } catch (error) {
        logger.error('Error checking voice availability', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    checkDeviceCompatibility();

    if (recordId && appointmentId) {
      logger.info('Auto-starting recording on screen mount', {
        appointmentId,
        recordId,
      });
      setTimeout(() => {
        startListening();
      }, 300);
    }

    return () => {
      logger.info('TranscribeScreen unmounting - cleaning up resources');

      if (recognitionTimer.current) {
        clearInterval(recognitionTimer.current);
        recognitionTimer.current = null;
      }

      if (isListening) {
        logger.info('Stopping active recording on component unmount');
        Voice.stop().catch(err => {
          logger.error('Error stopping Voice on unmount', {
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        });
      }

      safelyRemoveVoiceListeners();
      // Destroy Voice instance asynchronously
      (async () => {
        try {
          await Voice.destroy();
          logger.info('Voice destroyed on component unmount');
        } catch (err: any) {
          logger.error('Error destroying Voice', {error: err.message || err});
        }
      })();
    };
  }, []);

  const retryVoiceStart = async (
    locale = 'en-US',
    maxAttempts = 3,
    delay = 300,
  ): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await Voice.start(locale);
        return true;
      } catch (err: any) {
        logger.warn(`Voice.start failed on attempt ${attempt}`, {
          error: err.message || err,
        });
        if (attempt === maxAttempts) {
          showErrorToast(
            'Recognition Error',
            'Failed to start speech recognition. Please try again later.',
          );
          return false;
        }
        await new Promise(res => setTimeout(res, delay));
      }
    }
    return false;
  };

  const pauseTimer = () => {
    if (recognitionTimer.current) {
      clearInterval(recognitionTimer.current);
      recognitionTimer.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    pausedTimeRef.current = elapsed;
    logger.info('Recognition timer paused', {elapsed});
  };

  const resumeTimer = () => {
    startTimeRef.current = Date.now() - pausedTimeRef.current;
    recognitionTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      setRecognitionTime(formatTime(elapsed));
    }, 1000);
    logger.info('Recognition timer resumed', {
      pausedDuration: pausedTimeRef.current,
    });
  };

  const startListening = async () => {
    try {
      logger.info('Starting speech recognition process', {
        component: 'TranscribeScreen',
        method: 'startListening',
        platform: Platform.OS,
        platform_version: Platform.Version,
      });

      if (isListening) {
        logger.warn(
          'Speech recognition already in progress, ignoring start request',
        );
        return;
      }

      try {
        await Voice.destroy();
        logger.info('Voice instance destroyed before starting new session');
      } catch (error) {
        logger.warn('Error destroying Voice instance', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      setupVoiceListeners();

      const hasPermissions = await requestSpeechPermissions();
      if (!hasPermissions) {
        logger.warn('Speech recognition aborted - permissions not granted');
        return;
      }

      setRecognizedText('');
      lastSpeechRef.current = '';

      startTimeRef.current = Date.now();
      recognitionTimer.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setRecognitionTime(formatTime(elapsed));
      }, 1000);

      setTimeout(async () => {
        const ok = await retryVoiceStart('en-US');
        if (ok) {
          setIsListening(true);
          setRecordingStartTime(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          );
          logger.info('Voice.start succeeded via retry utility');
        }
      }, 100);

      logger.info('Speech recognition started successfully');

      if (recordId) {
        transcriptionAPI.startTranscription([]);

        logger.info('Transcription process started', {
          component: 'TranscribeScreen',
          method: 'startListening',
          recordId: recordId,
        });

        startRecording();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error('Failed to start speech recognition', {
        component: 'TranscribeScreen',
        method: 'startListening',
        error: errorMessage,
        stack: errorStack,
        platform: Platform.OS,
        platform_version: Platform.Version,
      });

      if (
        errorMessage.includes('permission') ||
        errorMessage.toLowerCase().includes('access') ||
        errorMessage.toLowerCase().includes('denied')
      ) {
        Alert.alert(
          'Permission Error',
          'Unable to access microphone. Please check your device settings and ensure microphone permissions are enabled.',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: openSettings},
          ],
        );
      } else {
        Alert.alert(
          'Recognition Error',
          'Failed to start speech recognition. Please try again or restart the app.',
          [{text: 'OK', style: 'default'}],
        );
      }
    }
  };

  const stopListening = async () => {
    if (stopInProgressRef.current) return;
    stopInProgressRef.current = true;
    try {
      if (!isListening && !isPaused) return;

      logger.info('Stopping speech recognition', {
        component: 'TranscribeScreen',
        method: 'stopListening',
        textLength: recognizedText?.length || 0,
        is_recording: recording,
      });

      if (recognitionTimer.current) {
        clearInterval(recognitionTimer.current);
        recognitionTimer.current = null;
      }

      const finalText = recognizedText;

      await Voice.stop();

      safelyRemoveVoiceListeners();

      setIsListening(false);
      setIsPaused(false);
      pausedTimeRef.current = 0;

      logger.info('Speech recognition stopped successfully', {
        component: 'TranscribeScreen',
        method: 'stopListening',
        textLength: finalText?.length || 0,
        duration: recognitionTime,
      });

      setLoadingModalVisible(true);

      await stopRecording();

      await processRecognitionForTranscription();
    } catch (error) {
      logger.error('Failed to stop speech recognition', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      safelyRemoveVoiceListeners();
      Alert.alert('Error', 'Failed to stop speech recognition');
      setLoadingModalVisible(false);
    } finally {
      stopInProgressRef.current = false;
    }
  };

  const pauseResumeRecording = async () => {
    if (!isPaused) {
      // pause timer and record elapsed
      pauseTimer();
      try {
        await Voice.stop();
        showInfoToast('Recording Paused', 'Audio recording has been paused');
      } catch (error: any) {
        logger.error('Error pausing recording', {
          error: error.message || error,
        });
      }
      setIsPaused(true);
      setIsListening(false);
    } else {
      // resume from paused state
      lastSpeechRef.current = '';
      setIsPaused(false);
      resumeTimer();
      const resumed = await retryVoiceStart('en-US');
      if (resumed) {
        setIsListening(true);
        showSuccessToast(
          'Recording Resumed',
          'Audio recording has been resumed',
        );
      }
    }
  };

  const processRecognitionForTranscription = async () => {
    const recordIdNumber = recordId ? parseInt(recordId, 10) : null;

    if (!recordIdNumber) {
      logger.error('No valid record ID available for processing recognition');
      setLoadingModalVisible(false);
      return;
    }

    if (!audioPath) {
      logger.error('No valid audio file path available for transcription');
      setLoadingModalVisible(false);
      return;
    }

    logger.info('Starting recognition processing flow', {
      component: 'TranscribeScreen',
      method: 'processRecognitionForTranscription',
      record_id: recordIdNumber,
      appointment_id: appointmentId,
      recognized_text_length: recognizedText?.length || 0,
      audio_path: audioPath,
    });

    try {
      logger.info('Step 1/4: Requesting signed URL for transcription');

      try {
        const signedUrlResponse = await safeDispatch<SignedUrlResponse>(
          getAudioRecordingSignedUrl,
          {record_id: recordIdNumber},
        );

        if (signedUrlResponse && signedUrlResponse.url) {
          logger.info(
            'Step 1/4 Complete: Obtained signed URL for transcription',
            {
              url_expiration: signedUrlResponse.expiration,
              has_fields: !!signedUrlResponse.fields,
            },
          );

          const audioData = Array.from(recognizedText).map(char =>
            char.charCodeAt(0),
          );

          logger.info('Step 2/4: Uploading audio to S3 via Redux action', {
            text_length: recognizedText.length,
            audio_data_length: audioData.length,
          });

          try {
            const uploadResult = await safeDispatch<S3UploadResponse>(
              uploadToS3Action,
              {
                signedUrlResponse,
                audioData,
                appointmentId,
                audioPath
              },
            );

            if (uploadResult && uploadResult.success) {
              logger.info(
                'Step 2/4 Complete: Successfully uploaded audio to S3 via Redux',
                {
                  success: uploadResult.success,
                  message: uploadResult.message,
                  recordId: uploadResult.recordId,
                },
              );

              try {
                logger.info('Step 3/4: Ending transcription with URL context');

                await transcriptionAPI.stopTranscription(signedUrlResponse.url);
                logger.info(
                  'Step 3/4 Complete: Transcription ended successfully',
                );

                if (audioPath) {
                  logger.info(
                    'Step 4/4: Sending audio file for transcription',
                    {
                      audio_path: audioPath,
                    },
                  );

                  try {
                    const transcribeResult = await safeDispatch<any>(
                      transcribeAudioChunkAction,
                      {
                        recordId: recordIdNumber,
                        sequenceId: 1,
                        audioPath: audioPath,
                      },
                    );

                    logger.info(
                      'Step 4/4 Complete: Audio file sent for transcription',
                      {
                        success: !!transcribeResult,
                        record_id: recordIdNumber,
                        audio_path: audioPath,
                      },
                    );
                  } catch (chunkError) {
                    logger.error(
                      'Step 4/4 Failed: Error sending audio file for transcription',
                      {
                        error:
                          chunkError instanceof Error
                            ? chunkError.message
                            : 'Unknown error',
                        record_id: recordIdNumber,
                        audio_path: audioPath,
                      },
                    );
                    setLoadingModalVisible(false);
                  }
                } else {
                  logger.warn(
                    'Step 4/4 Skipped: No audio file available to send',
                    {
                      record_id: recordIdNumber,
                    },
                  );
                  setLoadingModalVisible(false);
                }
              } catch (stopError) {
                logger.error('Step 3/4 Failed: Error stopping transcription', {
                  error:
                    stopError instanceof Error
                      ? stopError.message
                      : 'Unknown error',
                });
                setLoadingModalVisible(false);
              }
            } else {
              logger.error('Step 2/4 Failed: S3 upload was not successful', {
                response: uploadResult,
              });
              Alert.alert('Error', 'Failed to upload audio recording');
              setLoadingModalVisible(false);
            }
          } catch (uploadError) {
            logger.error('Step 2/4 Failed: Error during S3 upload action', {
              error:
                uploadError instanceof Error
                  ? uploadError.message
                  : 'Unknown error',
              record_id: recordIdNumber,
            });
            Alert.alert('Error', 'Failed to upload audio to S3');
            setLoadingModalVisible(false);
          }
        } else {
          logger.error('Step 1/4 Failed: No valid signed URL response', {
            response_payload: signedUrlResponse
              ? typeof signedUrlResponse
              : 'null',
          });
          setLoadingModalVisible(false);
        }
      } catch (urlError) {
        logger.error('Step 1/4 Failed: Error getting signed URL', {
          error: urlError instanceof Error ? urlError.message : 'Unknown error',
          record_id: recordIdNumber,
        });
        Alert.alert('Error', 'Failed to get signed URL for transcription');
        setLoadingModalVisible(false);
      }
    } catch (error: any) {
      logger.error('Error processing recognition for transcription', {
        component: 'TranscribeScreen',
        error: error.message || 'Unknown error',
        record_id: recordIdNumber,
      });
      Alert.alert('Error', 'Failed to process recognition for transcription');
      setLoadingModalVisible(false);
    }
  };

  useEffect(() => {
    if (soapNoteData && !loading && loadingModalVisible) {
      logger.info(
        'SOAP note data loaded and loading completed, closing loading modal',
      );
      setTimeout(() => {
        setLoadingModalVisible(false);
        logger.info(
          'Navigating to Appointments screen after SOAP note generation completed',
        );
        navigation.navigate('Appointments');
      }, 1500);
    }
  }, [soapNoteData, loading, loadingModalVisible, navigation]);

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: '#FFFFFF'}]}
      edges={['bottom', 'left', 'right']}>
      <Sidebar
        isVisible={isSidebarOpen}
        onClose={() => {}}
        userInfo={{name: 'George Milton', role: 'Doctor'}}
      />

      {/* Header with title and live badge */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Transcript</Text>
        {(isListening || isPaused) && (
          <View style={[styles.liveBadge, isPaused && styles.pausedBadge]}>
            <Text style={styles.liveText}>{isPaused ? 'PAUSED' : 'LIVE'}</Text>
          </View>
        )}
      </View>
      {/* Recording start time badge */}
      {recordingStartTime ? (
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>
            Transcript started at {recordingStartTime}
          </Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}>
          <View style={styles.content}>
            <View style={styles.resultContainer}>
              <Text style={styles.resultText}>{recognizedText}</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.generateButton} onPress={playAudio}>
          <Text style={styles.generateText}>Play Audio</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pauseButton}
          onPress={pauseResumeRecording}
          disabled={!isListening && !isPaused}>
          <Image
            source={
              isPaused
                ? require('../assets/start.png')
                : require('../assets/pause.png')
            }
            style={styles.pauseIcon}
          />
          <Text style={styles.pauseText}>{isPaused ? 'RESUME' : 'PAUSE'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() => {
            logger.info('Generate Notes button pressed', {
              appointmentId,
              recordId,
            });
            if (appointmentId && recordId) {
              stopListening();
              dispatch(clearSoapNoteData());
              setLoadingModalVisible(true);
              dispatch(generateSoapNotesAction(Number(appointmentId)));
              dispatch(setSoapNotePollActive(true));
              logger.info('SOAP note generation initiated', {
                appointmentId,
                recordId,
              });
            } else {
              Alert.alert(
                'Error',
                'Missing appointment or record ID to generate notes.',
              );
              logger.warn('Generate Notes: Missing appointmentId or recordId', {
                appointmentId,
                recordId,
              });
            }
          }}>
          <Image
            source={require('../assets/soap-notes.png')}
            style={styles.generateIcon}
          />
          <Text style={styles.generateText}>GENERATE NOTES</Text>
        </TouchableOpacity>
      </View>

      <TranscriptLoadingModal
        visible={loadingModalVisible}
        onRequestClose={() => {
          if (!soapNoteGenerationStatus || (soapNoteData && !loading)) {
            setLoadingModalVisible(false);
          } else {
            if (
              soapNoteGenerationStatus &&
              soapNoteGenerationStatus.soap_note_generation_status ===
                'completed' &&
              !soapNoteData
            ) {
              showInfoToast(
                'Loading',
                'SOAP note data is still being prepared...',
              );
            }
          }
        }}
        processingType={
          soapNoteGenerationStatus
            ? soapNoteGenerationStatus.soap_note_generation_status ===
                'completed' &&
              soapNoteData &&
              !loading
              ? 'completed'
              : 'generating'
            : 'recording'
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  timeBadge: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 10,
    marginTop: 5,
  },
  timeBadgeText: {color: '#666', fontSize: 14},
  controlsContainer: {
    flexDirection: 'column',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    height: 250,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginVertical: 10,
    width: '100%',
  },
  pauseIcon: {width: 16, height: 16, marginRight: 8, tintColor: Colors.primary},
  pauseText: {color: Colors.primary, fontWeight: 'bold'},
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flex: 1,
    marginBottom: 5,
    width: '100%',
  },
  generateIcon: {width: 16, height: 16, marginRight: 8, tintColor: 'white'},
  generateText: {color: 'white', fontWeight: 'bold'},
  resultContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    minHeight: '50%',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  keyboardAvoidingView: {
    flex: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  robotCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(144, 238, 144, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#3CB371',
  },
  robotImage: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
  },
  loadingSpinner: {
    marginVertical: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    paddingRight: 10,
  },
  liveBadge: {
    backgroundColor: 'red',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pausedBadge: {
    backgroundColor: 'orange',
  },
  liveText: {color: 'white', fontWeight: 'bold', fontSize: 12},
});

export default TranscribeScreen;
