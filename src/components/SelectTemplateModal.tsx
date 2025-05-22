import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import {Colors} from '../theme/Colors';

interface SelectTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onStartRecording: (templateName: string, useAsDefault: boolean) => void;
  defaultTemplate?: string;
}

const SelectTemplateModal = ({
  visible,
  onClose,
  onStartRecording,
  defaultTemplate = 'AWV template',
}: SelectTemplateModalProps) => {
  const templates = ['AWV template', 'Follow-up template', 'New Patient template', 'Referral template', 'Routine Check-up template'];
  
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplate);
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const closeDropdown = () => {
    if (dropdownVisible) {
      setDropdownVisible(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <Image 
                  source={require('../assets/soap-notes.png')}
                  style={styles.documentIcon} 
                  resizeMode="contain"
                />
              </View>
              
              <Text style={styles.modalTitle}>
                Please select a template to begin recording your SOAP note.
              </Text>
              
              <View style={styles.templateSelectionContainer}>
                <Text style={styles.templateLabel}>Select template*</Text>
                <TouchableOpacity 
                  style={styles.templateDropdown}
                  onPress={() => setDropdownVisible(!dropdownVisible)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.templateDropdownText}>{selectedTemplate}</Text>
                  <Image 
                    source={require('../assets/filter.png')} 
                    style={[styles.dropdownIcon, dropdownVisible && styles.dropdownIconRotated]}
                  />
                </TouchableOpacity>
                
                {dropdownVisible && (
                  <>
                    <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
                      <View style={styles.dropdownBackdrop} />
                    </TouchableWithoutFeedback>
                    <View style={styles.dropdownMenu}>
                      <ScrollView 
                        style={styles.dropdownScrollView}
                        showsVerticalScrollIndicator={true}
                        bounces={false}
                        contentContainerStyle={styles.dropdownScrollContent}
                        keyboardShouldPersistTaps="handled"
                      >
                        {templates.map((template, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.dropdownItem,
                              selectedTemplate === template && styles.dropdownItemSelected,
                              index === templates.length - 1 && styles.dropdownItemLast
                            ]}
                            onPress={() => {
                              setSelectedTemplate(template);
                              setDropdownVisible(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text 
                              style={[
                                styles.dropdownItemText,
                                selectedTemplate === template && styles.dropdownItemTextSelected
                              ]}
                            >
                              {template}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}
              </View>
              
              <View style={styles.checkboxContainer}>
                <View style={styles.checkboxTextContainer}>
                  <Text style={styles.checkboxText}>
                    Use this template as default and automatically proceed whenever I tap the mic. Once checked, this will not be shown again.
                  </Text>
                </View>
                <Switch
                  value={useDefaultTemplate}
                  onValueChange={setUseDefaultTemplate}
                  trackColor={{false: '#E0E0E0', true: Colors.primary}}
                  thumbColor={'#FFFFFF'}
                />
              </View>
              
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={onClose}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.recordButton} 
                  onPress={() => {
                    onStartRecording(selectedTemplate, useDefaultTemplate);
                  }}>
                  <Text style={styles.recordButtonText}>RECORD NOW</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F1F8F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  documentIcon: {
    width: 36,
    height: 36,
    tintColor: Colors.primary,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  templateSelectionContainer: {
    width: '100%',
    marginBottom: 20,
  },
  templateLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  templateDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9F9F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  templateDropdownText: {
    fontSize: 14,
    color: '#333333',
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    tintColor: '#888888',
    transform: [{ rotate: '90deg' }],
  },
  dropdownIconRotated: {
    transform: [{ rotate: '270deg' }],
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 76,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScrollView: {
    width: '100%',
    maxHeight: 200,
  },
  dropdownScrollContent: {
    flexGrow: 1,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
  dropdownItemSelected: {
    backgroundColor: '#F1F8F4',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333333',
  },
  dropdownItemTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  checkboxText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 18,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F2F2F2',
    borderRadius: 8,
    paddingVertical: 15,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  recordButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 15,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default SelectTemplateModal;
