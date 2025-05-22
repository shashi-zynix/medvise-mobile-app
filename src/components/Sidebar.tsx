import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '../theme/Colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSidebar } from '../context/SidebarContext';
import { clearEncryptedCredentials } from '../utils/secureStorage';
import { useAppDispatch } from '../redux/store';
import { logout } from '../redux/slices/authSlice';
import logger from '../utils/logger';

interface SidebarProps {
  isVisible: boolean;
  onClose: () => void;
  userInfo?: {
    name: string;
    role: string;
    avatar?: any;
  };
}

const Sidebar = ({ isVisible, userInfo }: SidebarProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { closeSidebar } = useSidebar();
  const dispatch = useAppDispatch();

  if (!isVisible) return null;

  const currentScreen = route.name as keyof RootStackParamList;

  const menuItems = [
    { 
      id: 'transcribe', 
      title: 'Transcribe Now', 
      icon: require('../assets/transcribe.png'),
      screen: 'Transcribe' 
    },
    { 
      id: 'appointments', 
      title: 'Appointments', 
      icon: require('../assets/appointment.png'),
      screen: 'Appointments' 
    },
    // { 
    //   id: 'patients', 
    //   title: 'Patients', 
    //   icon: require('../assets/patient.png'),
    //   screen: 'Home' 
    // },
    // { 
    //   id: 'settings', 
    //   title: 'Settings', 
    //   icon: require('../assets/setting.png'),
    //   screen: 'Home' 
    // },
    // { 
    //   id: 'help', 
    //   title: 'Help & Support', 
    //   icon: require('../assets/help.png'),
    //   screen: 'Home' 
    // },
    { 
      id: 'logout', 
      title: 'Log Out', 
      icon: require('../assets/logout.png'),
      screen: 'Login' 
    },
  ];

  const handleNavigation = (screenName: keyof RootStackParamList, menuId: string) => {
    closeSidebar();
    
    if (menuId === 'logout') {
      clearEncryptedCredentials()
        .catch(error => {
          logger.error('Error clearing encrypted credentials during logout:', error);
        })
        .finally(() => {
          dispatch(logout());
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        });
    } else {
      navigation.navigate(screenName as never);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <ScrollView>
          <View style={styles.profileSection}>
            <Image 
              source={userInfo?.avatar || require('../assets/logo.png')} 
              style={styles.avatar}
            />
            <Text style={styles.userName}>{userInfo?.name || 'George Milton'}</Text>
            <Text style={styles.userRole}>{userInfo?.role || 'Doctor'}</Text>
          </View>
          
          <View style={styles.menuContainer}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.screen === currentScreen && styles.activeMenuItem
                ]}
                onPress={() => handleNavigation(item.screen as keyof RootStackParamList, item.id)}
              >
                <Image 
                  source={item.icon} 
                  style={[
                    styles.menuIcon,
                    item.screen === currentScreen && styles.activeMenuIcon
                  ]} 
                />
                <Text 
                  style={[
                    styles.menuText,
                    item.screen === currentScreen && styles.activeMenuText
                  ]}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.inProgressSection}>
            <Text style={styles.sectionTitle}>IN PROGRESS</Text>
            <View style={styles.appointmentCard}>
              <Image 
                source={require('../assets/logo.png')} 
                style={styles.appointmentImage}
              />
              <Text style={styles.appointmentText}>
                Your appointments haven't started for today
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
      
      <TouchableOpacity style={styles.closeArea} onPress={closeSidebar} />
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
  },
  container: {
    width: '70%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeArea: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  userRole: {
    fontSize: 14,
    color: Colors.textTertiary,
  },
  menuContainer: {
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: Colors.primary,
  },
  menuIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: Colors.textSecondary,
  },
  activeMenuIcon: {
    tintColor: Colors.textLight,
  },
  menuText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeMenuText: {
    color: Colors.textLight,
    fontWeight: '500',
  },
  inProgressSection: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textTertiary,
    marginBottom: 10,
  },
  appointmentCard: {
    backgroundColor: Colors.lightGreen,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  appointmentImage: {
    width: 120,
    height: 100,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  appointmentText: {
    fontSize: 14,
    textAlign: 'center',
    color: Colors.textSecondary,
  },
});

export default Sidebar;