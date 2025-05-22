import React from 'react';
import { View, Text, StyleSheet, Modal, Image, ActivityIndicator } from 'react-native';
import { Colors } from '../theme/Colors';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';

const transcriptLoadingIcon = require('../assets/transcript-loading.png');

interface TranscriptLoadingModalProps {
  visible: boolean;
  onRequestClose: () => void;
  processingType?: 'recording' | 'transcribing' | 'generating' | 'completed';
}

const TranscriptLoadingModal: React.FC<TranscriptLoadingModalProps> = ({
  visible,
  onRequestClose,
  processingType = 'recording',
}) => {
  const soapNoteGenerationStatus = useSelector((state: RootState) => 
    state.appointments.soapNoteGenerationStatus?.soap_note_generation_status
  );
  const soapNoteData = useSelector((state: RootState) => state.appointments.soapNoteData);
  
  let title = 'Hurray!';
  let message = 'Your recording has been successfully ended. Please wait for 30-40 secs to generate transcript';
  
  if (processingType === 'transcribing') {
    title = 'Transcribing';
    message = 'Your recording is being transcribed. This may take a moment...';
  } else if (processingType === 'generating') {
    title = 'Generating SOAP Notes';
    
    if (soapNoteGenerationStatus === 'pending') {
      message = 'Your SOAP notes are queued for generation. Please wait...';
    } else if (soapNoteGenerationStatus === 'in_progress') {
      message = 'Your SOAP notes are being generated. This may take a minute...';
    } else if (soapNoteGenerationStatus === 'completed' && !soapNoteData) {
      message = 'SOAP notes are ready! Loading data...';
    }
  } else if (processingType === 'completed') {
    title = 'Complete!';
    message = 'Your SOAP notes have been generated successfully.';
  }
  
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.robotCircle}>
            <Image 
              source={transcriptLoadingIcon}
              style={styles.robotImage}
              resizeMode="contain"
            />
          </View>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loadingSpinner} />
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalText}>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    shadowOffset: { width: 0, height: 2 },
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
});

export default TranscriptLoadingModal;