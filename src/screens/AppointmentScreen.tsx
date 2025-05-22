import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SelectTemplateModal from '../components/SelectTemplateModal';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '../theme/Colors';
import {RootStackParamList} from '../navigation/AppNavigator';
import Sidebar from '../components/Sidebar';
import {useSidebar} from '../context/SidebarContext';
import {useAppDispatch, useAppSelector} from '../redux/store';
import logger from '../utils/logger';
import {
  fetchAppointments,
  updateParams,
  createRecord,
  fetchAppointmentDetail,
  resetRecord,
  setSelectedTimePeriod,
} from '../redux/slices/appointmentsSlice';
import {
  Appointment as AppointmentType,
  GetAppointmentsParams,
} from '../api/appointmentService';
const formatDate = (date: Date, formatStr: string): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const hours = date.getHours();
  const hoursStr = String(hours).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // Convert to 12-hour format
  const hours12Padded = String(hours12).padStart(2, '0');
  
  switch (formatStr) {
    case 'yyyy-MM-dd':
      return `${year}-${month}-${day}`;
    case 'MM/dd/yyyy':
      return `${month}/${day}/${year}`;
    case 'hh:mm a':
      return `${hours12Padded}:${minutes} ${ampm}`;
    case "yyyy-MM-dd'T'HH:mm:ss.SSS":
      return `${year}-${month}-${day}T${hoursStr}:${minutes}:${seconds}.${milliseconds}`;
    default:
      return date.toString();
  }
};

const parseISODate = (dateString: string): Date => {
  return new Date(dateString);
};

// Subtract days from a date
const subtractDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

const micIcon = require('../assets/start.png');
const upcomingOff = require('../assets/upcoming-off.png');
const upcomingOn = require('../assets/upcoming-on.png');
const progressOff = require('../assets/progress-off.png');
const progressOn = require('../assets/progress-on.png');
const completeOff = require('../assets/export-off.png');
const completeOn = require('../assets/export-on.png');

type AppointmentScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Appointments'>;
};

interface AppointmentDisplay {
  id: string;
  patientName: string;
  date: string;
  time: string;
  type: 'ECW' | 'Adhoc';
  status: string;
  age?: string;
  gender?: string;
}

const formatDateForAPI = (date: Date): string => {
  return formatDate(date, 'yyyy-MM-dd');
};

const getDateRangeParams = (
  tabIndex: number,
): Pick<
  GetAppointmentsParams,
  'appointment_date_start' | 'appointment_date_end'
> => {
  const today = new Date();

  switch (tabIndex) {
    case 0: // Today
      return {
        appointment_date_start: formatDateForAPI(today),
        appointment_date_end: formatDateForAPI(today),
      };
    case 1: // Last 7 days
      return {
        appointment_date_start: formatDateForAPI(subtractDays(today, 7)),
        appointment_date_end: formatDateForAPI(today),
      };
    case 2: // Last 14 days
      return {
        appointment_date_start: formatDateForAPI(subtractDays(today, 14)),
        appointment_date_end: formatDateForAPI(today),
      };
    default:
      return {
        appointment_date_start: formatDateForAPI(today),
        appointment_date_end: formatDateForAPI(today),
      };
  }
};

const AppointmentScreen = ({navigation}: AppointmentScreenProps) => {
  const {isSidebarOpen, toggleSidebar} = useSidebar();
  const dispatch = useAppDispatch(); 
  const {
    appointments = [],
    loading = false,
    error = null,
    total: totalAppointments = 0,
    record = null,
    selectedAppointmentDetail = null,
    selectedTimePeriod = 0,
  } = useAppSelector(state => state.appointments || {});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(selectedTimePeriod); // Use Redux state value for initial state
  const [selectedCategory, setSelectedCategory] = useState('upcoming'); // 'upcoming', 'progress', 'complete'
  const [displayAppointments, setDisplayAppointments] = useState<
    AppointmentDisplay[]
  >([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [defaultTemplate, setDefaultTemplate] = useState<string | null>(null);
  const [useDefaultTemplateAuto, setUseDefaultTemplateAuto] = useState(false);
  const mapAppointmentsForDisplay = (
    apiAppointments: AppointmentType[],
  ): AppointmentDisplay[] => {
    if (!apiAppointments || !Array.isArray(apiAppointments)) {
      return [];
    }
    return apiAppointments.map(appointment => {
      let appointmentDate;
      try {
        appointmentDate = parseISODate(appointment.appointment_time);
        if (isNaN(appointmentDate.getTime())) {
          appointmentDate = new Date(); 
        }
      } catch (e) {
        appointmentDate = new Date(); 
      }
      return {
        id: appointment.id.toString(),
        patientName: appointment.appointment_name || 'No Name',
        date: formatDate(appointmentDate, 'MM/dd/yyyy'),
        time:
          formatDate(appointmentDate, 'hh:mm a') +
          ' - ' +
          formatDate(
            new Date(appointmentDate.setHours(appointmentDate.getHours() + 1)),
            'hh:mm a',
          ),
        type: appointment.appointment_type === 'adhoc' ? 'Adhoc' : 'ECW',
        status: appointment.appointment_status,
        age: appointment.metadata?.age || '0',
        gender: appointment.metadata?.sex_at_birth || 'U',
      };
    });
  };

  useEffect(() => {
    const dateParams = getDateRangeParams(selectedTab);

    dispatch(updateParams(dateParams));

    dispatch(
      fetchAppointments({
        ...dateParams,
        limit: 30,
        offset: 0,
        order_by_desc: true,
      }),
    );
  }, [dispatch, selectedTab]); 
  
  useEffect(() => {
    if (record && selectedAppointmentId) {
      logger.info('Record created successfully in state:', record);

      dispatch(fetchAppointmentDetail(record.appointment_id))
        .unwrap()
        .then(() => {
          logger.info('Appointment details fetched successfully');
          if (navigation) {
            navigation.navigate('Transcribe', {
              appointmentId: record.appointment_id.toString(),
              recordId: record.record_id.toString(),
            });
          } else {
            logger.warn('Navigation prop is not available');
          }
        })
        .catch(error => {
          logger.error('Failed to fetch appointment details:', error);
          if (navigation) {
            navigation.navigate('Transcribe', {
              appointmentId: record.appointment_id.toString(),
              recordId: record.record_id.toString(),
            });
          }
        });
    }
  }, [record, navigation, dispatch, selectedAppointmentId]);

  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      const mappedAppointments = mapAppointmentsForDisplay(appointments);
      setDisplayAppointments(mappedAppointments);
    }
    console.log('Mapped Appointments:', appointments);
  }, [appointments]); 

  const filteredAppointments = displayAppointments.filter(appointment => {
    logger.debug('Filtered Appointments:', appointment);
    if (
      searchQuery &&
      !appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    } 
    if (selectedCategory === 'upcoming' && appointment.status !== 'scheduled') {
      return false;
    } else if (
      selectedCategory === 'progress' &&
      appointment.status !== 'in_progress'
    ) {
      return false;
    } else if (
      selectedCategory === 'complete' &&
      appointment.status !== 'completed'
    ) {
      return false;
    }

    return true;
  });
  const renderAppointmentCard = ({item}: {item: AppointmentDisplay}) => {
    let borderColor = '#27AE60'; 

    if (item.status === 'scheduled') {
      borderColor = '#27AE60'; 
    } else if (item.status === 'in_progress') {
      borderColor = '#F2C94C'; 
    } else if (item.status === 'completed') {
      borderColor = '#2F80ED'; 
    }

    // Format for gender display
    const genderDisplay =
      !item.gender || item.gender === ''
        ? 'U'
        : item.gender === 'M'
        ? 'M'
        : item.gender === 'F'
        ? 'F'
        : 'U';

    return (
      <View style={[styles.appointmentCard, {borderLeftColor: borderColor}]}>
        <View style={styles.appointmentInfo}>
          <Text style={styles.patientName}>
            {item.patientName} | {item.age} | {genderDisplay}
          </Text>
          <Text style={styles.appointmentTime}>{item.time}</Text>
        </View>
        <TouchableOpacity
          style={styles.voiceIconContainer}
          onPress={() => handleMicPress({appointmentId: item.id})}>
          <Image source={micIcon} style={styles.voiceIcon} />
        </TouchableOpacity>
      </View>
    );
  };

  const handleTabChange = (index: number) => {
    setSelectedTab(index);
    
    dispatch(setSelectedTimePeriod(index));
    logger.info(`Tab changed to: ${index === 0 ? 'Today' : index === 1 ? 'Last 7 days' : 'Last 14 days'}`);

    const dateParams = getDateRangeParams(index);
    dispatch(updateParams(dateParams));

    dispatch(
      fetchAppointments({
        ...dateParams,
        status: undefined, 
        limit: 30,
        offset: 0,
        order_by_desc: true,
      }),
    );
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };
  const getCategoryCount = (category: string): number => {
    // Count appointments in each category from the API data
    const count = appointments.filter((appointment: AppointmentType) => {
      if (
        category === 'upcoming' &&
        appointment.appointment_status === 'scheduled'
      ) {
        return true;
      } else if (
        category === 'progress' &&
        appointment.appointment_status === 'in_progress'
      ) {
        return true;
      } else if (
        category === 'complete' &&
        appointment.appointment_status === 'completed'
      ) {
        return true;
      }
      return false;
    }).length;

    return count;
  }; 
  interface MicPressParams {
    appointmentId: string;
  }
  const handleMicPress = ({appointmentId}: MicPressParams): void => {
    setSelectedAppointmentId(appointmentId);

    setModalVisible(true); 
  };

  const handleStartRecording = (
    appointmentIdForRecording: string, 
    templateName: string,
    useAsDefault: boolean
  ): void => {
    if (!appointmentIdForRecording) { 
      logger.error('No appointment ID selected for recording');
      return;
    }
  
    setModalVisible(false);
  
    if (useAsDefault) {
      setDefaultTemplate(templateName);
      setUseDefaultTemplateAuto(true);
  
      AsyncStorage.setItem('defaultTemplate', templateName)
        .catch(err => logger.error('Failed to save default template:', err));
      AsyncStorage.setItem('useDefaultTemplate', 'true')
        .catch(err => logger.error('Failed to save template preference:', err));
  
      logger.info(`Saved default template: ${templateName}`);
    }
  
    const appointmentIdNumber = parseInt(appointmentIdForRecording, 10); // Changed: Use the direct parameter
    if (isNaN(appointmentIdNumber)) {
      logger.error('Invalid appointment ID for recording:', appointmentIdForRecording);
      return;
    }
  
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    const milliseconds = String(currentDate.getMilliseconds()).padStart(3, '0');
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
  
    const recordPayload = {
      appointment_id: appointmentIdNumber,
      start_time: formattedDate,
      content_type: 'audio/webm',
      file_type: 'webm',
      template_name: templateName,
      use_default_template: useAsDefault,
    }; 
    dispatch(createRecord(recordPayload))
      .unwrap()
      .catch((error: Error) => {
        logger.error('Failed to create record:', error);
        if (navigation) {
          navigation.navigate('Transcribe', { appointmentId: appointmentIdForRecording }); // Changed: Use direct parameter
        }
      });
  };

  useEffect(() => {
    const loadTemplatePreferences = async () => {
      try {
        const savedTemplate = await AsyncStorage.getItem('defaultTemplate');
        const useDefault = await AsyncStorage.getItem('useDefaultTemplate');
        
        if (savedTemplate) {
          setDefaultTemplate(savedTemplate);
        }
        
        if (useDefault === 'true') {
          setUseDefaultTemplateAuto(true);
        }
      } catch (error) {
        logger.error('Failed to load template preferences:', error);
      }
    };

    loadTemplatePreferences();
  }, []);

  useEffect(() => {
    return () => {
      setSelectedAppointmentId(null);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setSelectedAppointmentId(null);
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const resetRecordState = () => {
      dispatch(resetRecord());
    };
    
    resetRecordState();
    
    const unsubscribe = navigation.addListener('focus', resetRecordState);
    
    return unsubscribe;
  }, [dispatch, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Sidebar
        isVisible={isSidebarOpen}
        onClose={() => {}}
        userInfo={{
          name: 'Dr. Smith',
          role: 'Doctor',
        }}
      />

      <View style={styles.mainContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Image
              source={require('../assets/menu.png')}
              style={styles.menuIcon}
            />
          </TouchableOpacity>
          <Text style={styles.welcomeText}>Welcome, Dr. Smith</Text>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity style={styles.notificationIcon}>
              <Image
                source={require('../assets/notification.png')}
                style={styles.icon}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileIcon}>
              <View style={styles.profileIconBg}>
                <Text style={styles.profileIconText}>DS</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        
        <SelectTemplateModal 
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onStartRecording={(templateName, useAsDefault) => { 
            if (selectedAppointmentId) { 
              handleStartRecording(selectedAppointmentId, templateName, useAsDefault);
            } else {
              logger.error(
                'No appointment ID selected when starting recording from modal',
              );
            }
          }}
          defaultTemplate={defaultTemplate || "AWV template"}
        />

        <View style={styles.searchBarContainer}>
          <View style={styles.searchContainer}>
            <Image
              source={require('../assets/Search.png')}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search appointment"
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#AEAEAE"
            />
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              const dateParams = getDateRangeParams(selectedTab);
              dispatch(
                fetchAppointments({
                  ...dateParams,
                  limit: 30,
                  offset: 0,
                  order_by_desc: true,
                }),
              );
            }}>
            <Image
              source={require('../assets/reload.png')}
              style={styles.refreshIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['Today', 'Last 7 days', 'Last 14 days'].map((tab, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.tabButton,
                selectedTab === index && styles.selectedTabButton,
              ]}
              onPress={() => handleTabChange(index)}>
              <Text
                style={[
                  styles.tabText,
                  selectedTab === index && styles.selectedTabText,
                ]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.categoryContainer}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === 'upcoming' && styles.selectedCategoryButton,
            ]}
            onPress={() => handleCategoryChange('upcoming')}>
            <View style={styles.categoryIconContainer}>
              <Image
                source={
                  selectedCategory === 'upcoming' ? upcomingOn : upcomingOff
                }
                style={styles.categoryIcon}
              />
            </View>
            <Text style={styles.categoryLabel}>Upcoming</Text>
            <Text style={styles.categoryCount}>
              ({getCategoryCount('upcoming')})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === 'progress' && styles.selectedCategoryButton,
            ]}
            onPress={() => handleCategoryChange('progress')}>
            <View style={styles.categoryIconContainer}>
              <Image
                source={
                  selectedCategory === 'progress' ? progressOn : progressOff
                }
                style={styles.categoryIcon}
              />
            </View>
            <Text style={styles.categoryLabel}>Progress</Text>
            <Text style={styles.categoryCount}>
              ({getCategoryCount('progress')})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === 'complete' && styles.selectedCategoryButton,
            ]}
            onPress={() => handleCategoryChange('complete')}>
            <View style={styles.categoryIconContainer}>
              <Image
                source={
                  selectedCategory === 'complete' ? completeOn : completeOff
                }
                style={styles.categoryIcon}
              />
            </View>
            <Text style={styles.categoryLabel}>Complete</Text>
            <Text style={styles.categoryCount}>
              ({getCategoryCount('complete')})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appointment List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredAppointments}
            renderItem={renderAppointmentCard}
            keyExtractor={item => item.id}
            style={styles.appointmentList}
            contentContainerStyle={styles.listContentContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No appointments found</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 32,
    backgroundColor: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  menuIcon: {
    width: 24,
    height: 24,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  headerRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    marginRight: 16,
  },
  icon: {
    width: 24,
    height: 24,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    flex: 1,
    marginRight: 12,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#8E8E93',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    fontWeight: '400',
  },
  refreshButton: {
    padding: 6,
    height: 40,
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E1E1E1',
  },
  refreshIcon: {
    width: 24,
    height: 24,
    tintColor: Colors.primary,
  },
  tabContainer: {
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  tabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedTabButton: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTabText: {
    color: 'white',
  },
  categoryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryButton: {
    alignItems: 'center',
    flex: 1,
  },
  selectedCategoryButton: {
    // Add any styling for selected category if needed
  },
  categoryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryIcon: {
    width: 24,
    height: 24,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  appointmentList: {
    flex: 1,
  },
  listContentContainer: {
    paddingBottom: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  appointmentInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  voiceIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceIcon: {
    width: 24,
    height: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
});

export default AppointmentScreen;
