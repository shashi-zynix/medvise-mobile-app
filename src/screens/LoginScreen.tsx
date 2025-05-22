import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Dimensions,
  Animated,
  Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';
import { Colors } from '../theme/Colors';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/AppNavigator';
import { loginUser } from '../redux/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../redux/store';
import { STORAGE_KEYS } from '../utils/literals/appliterals';
import { restoreSessionCookies, hasStoredCredentials, getStoredUserData, getStoredEncryptedCredentials } from '../utils/authStorage';
import { storeEncryptedCredentials, clearEncryptedCredentials } from '../utils/secureStorage';
import logger from '../utils/logger';
import env from '../environment';

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const isDarkMode = false;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { error, user } = useAppSelector(state => state.auth);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(20))[0];

  const dispatch = useAppDispatch();
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    const checkSavedCredentials = async () => {
      try {
        const hasCredentials = await hasStoredCredentials();
        
        if (hasCredentials) {
          setRememberMe(true);
          
          await restoreSessionCookies();
          
          const encryptedCredentials = await getStoredEncryptedCredentials();
          
          if (encryptedCredentials && !user) {
            logger.info('Found encrypted credentials, attempting auto-login');
            
            setEmail(encryptedCredentials.email);
            
            setLoading(true);
            
            dispatch(loginUser({ 
              email: encryptedCredentials.email, 
              password: encryptedCredentials.password 
            }))
              .unwrap()
              .then(() => {
                logger.info('Auto-login successful');
                navigation.replace('Appointments');
              })
              .catch((error) => {
                logger.error('Auto-login failed:', error);
                Alert.alert(
                  "Auto-login Failed",
                  "Your saved credentials have expired. Please enter your password again.",
                  [{ text: "OK" }]
                );
              })
              .finally(() => {
                setLoading(false);
              });
          } else {
            const userData = await getStoredUserData();
            
            if (userData) {
              if (userData.email) {
                setEmail(userData.email);
              }
              
              if (!user) {
                logger.info('Found saved login credentials, but no encrypted password for auto-login');
              }
            }
          }
        }
      } catch (error) {
        logger.error('Error retrieving saved credentials:', error);
      }
    };
    
    checkSavedCredentials();
  }, [dispatch, navigation, user]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return '';
  };

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  };  

  const saveAuthDataToStorage = async (userData: any) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userData));
      
      await AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, JSON.stringify(rememberMe));
      
      if (rememberMe && email && password) {
        await storeEncryptedCredentials(email, password);
        logger.info('Encrypted credentials stored successfully');
      } else if (!rememberMe) {
        await clearEncryptedCredentials();
        logger.info('Encrypted credentials cleared');
      }
      
      const apiUrl = env.API_BASE_URL;
      const cookieURL = Platform.OS === 'ios' 
        ? apiUrl.startsWith('http') ? apiUrl : `https://${apiUrl}`
        : apiUrl.replace(/^https?:\/\//, '');
      
      logger.info('Using API URL for cookies:', { 
        apiUrl: apiUrl,
        cookieURL: cookieURL,
        platform: Platform.OS
      });
      
      const cookies = await CookieManager.get(cookieURL);
      
      if (cookies) {
        if (cookies.sessionid) {
          await AsyncStorage.setItem(STORAGE_KEYS.SESSION_ID, cookies.sessionid.value);
        }
        
        if (cookies.csrftoken) {
          await AsyncStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, cookies.csrftoken.value);
        }
      }
      logger.info('Authentication data saved successfully');
    } catch (error) {
      logger.error('Error saving authentication data:', error);
    }
  };

  const handleLogin = () => {
    const emailValidationError = validateEmail(email);
    const passwordValidationError = validatePassword(password);

    setEmailError(emailValidationError);
    setPasswordError(passwordValidationError);

    if (!emailValidationError && !passwordValidationError) {
      setLoading(true);
      
      dispatch(loginUser({ email, password }))
        .unwrap()
        .then((result) => {
          setLoading(false);
          
          if (rememberMe) {
            saveAuthDataToStorage(result.user);
          } else {
            AsyncStorage.multiRemove([
              STORAGE_KEYS.USER_INFO,
              STORAGE_KEYS.REMEMBER_ME,
              STORAGE_KEYS.SESSION_ID
            ]);
          }
          
          navigation.replace('Appointments');
        })
        .catch(() => {
          setLoading(false);
        });
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const toggleRememberMe = () => {
    setRememberMe(!rememberMe);
  };

  return (
    <SafeAreaView 
      style={[
        styles.container,
        { backgroundColor: '#FFFFFF' }
      ]}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.formContainer,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <Image 
                source={require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={[
              styles.title,
              { color: isDarkMode ? Colors.textLight : Colors.textPrimary }
            ]}>
              Welcome
            </Text>
            <Text style={[
              styles.subtitle,
              { color: isDarkMode ? Colors.gray : Colors.textSecondary }
            ]}>
              Please login to your account
            </Text>

            <View style={styles.inputContainer}>
              <InputField
                label="Email ID"
                placeholder="abc@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) setEmailError('');
                }}
                error={emailError}
                containerStyle={{marginBottom: 16}}
              />
              <InputField
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                showPasswordToggle
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) setPasswordError('');
                }}
                error={passwordError}
              />
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.rememberMeContainer}
                onPress={toggleRememberMe}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.checkbox,
                  rememberMe && { backgroundColor: Colors.primary, borderColor: Colors.primary }
                ]}>
                  {rememberMe && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[
                  styles.rememberMeText,
                  { color: isDarkMode ? Colors.gray : Colors.textSecondary }
                ]}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={handleForgotPassword}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.forgotPassword,
                  { color: Colors.primary }
                ]}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              title="LOGIN"
              onPress={handleLogin}
              loading={loading}
              disabled={!email || !password || loading}
              style={styles.loginButton}
            />

            <View style={styles.signupContainer}>
              <Text style={[
                styles.signupText,
                { color: isDarkMode ? Colors.gray : Colors.textSecondary }
              ]}>
                Don't have an account?
              </Text>
              <TouchableOpacity 
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.signupLink,
                  { color: Colors.primary }
                ]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formContainer: {
    paddingVertical: 40,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 80,
    marginTop: 20,
  },
  logo: {
    width: 220,
    height: 90,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    color: '#3C3C43',
  },
  inputContainer: {
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 14,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: 32,
    marginTop: 16,
    height: 48,
    borderRadius: 8,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default LoginScreen;