import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, FlatList } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/Colors';
import Button from '../components/Button';
import InputField from '../components/InputField';
import Sidebar from '../components/Sidebar';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSidebar } from '../context/SidebarContext';
import logger from '../utils/logger';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const isDarkMode = false;
  
  const { isSidebarOpen } = useSidebar();
  
  const [visitType, setVisitType] = useState('ECW-registered patient');
  const [patientName, setPatientName] = useState('John Doe');
  const [patientAge, setPatientAge] = useState('43');
  const [patientGender, setPatientGender] = useState('Male');
  const [medicalRecordNumber, setMedicalRecordNumber] = useState('43089734');
  const [showVisitTypeDropdown, setShowVisitTypeDropdown] = useState(false);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);

  const visitTypeOptions = [
    'ECW-registered patient',
    'New patient',
    'Follow-up visit',
    'Consultation'
  ];

  const genderOptions = [
    'Male',
    'Female',
    'Other',
    'Prefer not to say'
  ];

  const handleStartRecording = () => {
    navigation.navigate('Transcribe', {
      patientInfo: {
        name: patientName,
        age: patientAge,
        gender: patientGender,
        mrn: medicalRecordNumber,
      }
    });
  };
    const handleUploadAudio = () => {
    logger.info('Upload audio functionality to be implemented');
  };

  const handleHelpSupport = () => {
    logger.info('Help/support functionality to be implemented');
  };

  const selectVisitType = (option: string) => {
    setVisitType(option);
    setShowVisitTypeDropdown(false);
  };

  const selectGender = (option: string) => {
    setPatientGender(option);
    setShowGenderDropdown(false);
  };
  
  return (
    <SafeAreaView 
      style={[
        styles.container, 
        { backgroundColor: '#ffffff' }
      ]}
      edges={['bottom', 'left', 'right']}
    >
      <Sidebar 
        isVisible={isSidebarOpen}
        onClose={() => {}}
        userInfo={{
          name: 'Anupama',
          role: 'Doctor',
        }}
      />
      
      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome Back, Anupama
        </Text>
        
        <Text style={styles.instructionText}>
          To begin transcribing, please select the type of visit and fill out the patient details.
        </Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Patient Context</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Type of Visit</Text>
            <TouchableOpacity 
              style={styles.dropdownContainer}
              onPress={() => setShowVisitTypeDropdown(!showVisitTypeDropdown)}
            >
              <Text style={styles.dropdownText}>{visitType}</Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
            
            <Modal
              visible={showVisitTypeDropdown}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowVisitTypeDropdown(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowVisitTypeDropdown(false)}
              >
                <View style={styles.dropdownModal}>
                  <FlatList
                    data={visitTypeOptions}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          visitType === item && styles.dropdownItemSelected
                        ]}
                        onPress={() => selectVisitType(item)}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            visitType === item && styles.dropdownItemTextSelected
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
          
          <InputField
            label="Name"
            value={patientName}
            onChangeText={setPatientName}
            containerStyle={styles.inputContainer}
            inputContainerStyle={styles.inputField}
          />
          
          <View style={styles.rowContainer}>
            <View style={styles.halfContainer}>
              <InputField
                label="Age"
                value={patientAge}
                onChangeText={setPatientAge}
                containerStyle={styles.inputContainer}
                inputContainerStyle={styles.inputField}
                keyboardType="number-pad"
              />
            </View>
            
            <View style={styles.halfContainer}>
              <Text style={styles.label}>Gender</Text>
              <TouchableOpacity 
                style={styles.dropdownContainer}
                onPress={() => setShowGenderDropdown(!showGenderDropdown)}
              >
                <Text style={styles.dropdownText}>{patientGender}</Text>
                <Text style={styles.dropdownIcon}>▼</Text>
              </TouchableOpacity>
              
              <Modal
                visible={showGenderDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowGenderDropdown(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowGenderDropdown(false)}
                >
                  <View style={[styles.dropdownModal, styles.genderDropdownModal]}>
                    <FlatList
                      data={genderOptions}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={[
                            styles.dropdownItem,
                            patientGender === item && styles.dropdownItemSelected
                          ]}
                          onPress={() => selectGender(item)}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              patientGender === item && styles.dropdownItemTextSelected
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                      showsVerticalScrollIndicator={false}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
          
          <InputField
            label="Medical Record Number (MRN)"
            value={medicalRecordNumber}
            onChangeText={setMedicalRecordNumber}
            containerStyle={styles.inputContainer}
            inputContainerStyle={styles.inputField}
          />
          
          <Button
            title="Start recording"
            onPress={handleStartRecording}
            style={{...styles.button, ...styles.recordButton}}
          />
          
          <Button
            title="Upload Audio"
            onPress={handleUploadAudio}
            variant="outline"
            style={styles.button}
            textStyle={{ color: Colors.secondary }}
          />
          
          <Button
            title="Test Voice to Text"
            onPress={() => navigation.navigate('TestAudio')}
            variant="outline"
            style={{...styles.button, backgroundColor: '#f0f8ff', borderColor: Colors.primary}}
            textStyle={{ color: Colors.primary }}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.helpButton}
          onPress={handleHelpSupport}
        >
          <Image 
            source={require('../assets/help.png')} 
            style={styles.helpIcon}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 5,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputField: {
    backgroundColor: 'white',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfContainer: {
    width: '48%',
  },
  button: {
    marginBottom: 10,
    height: 50,
  },
  recordButton: {
    backgroundColor: '#00A651', 
  },
  helpButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  helpIcon: {
    width: 24,
    height: 24,
    tintColor: '#00A651', 
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 6,
    width: '85%',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  genderDropdownModal: {
    width: '40%',
    position: 'relative',
    right: -30,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.lightGreen,
  },
  dropdownItemText: {
    fontSize: 16,
    color: Colors.textPrimary,
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default HomeScreen;