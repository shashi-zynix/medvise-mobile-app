import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme/Colors';
import InputField from '../components/InputField';
import Button from '../components/Button';
import { RootStackParamList } from '../navigation/AppNavigator';

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen = ({ navigation }: ForgotPasswordScreenProps) => {
  const isDarkMode = false;
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return '';
  };

  const handleSubmit = () => {
    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);

    if (!emailValidationError) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setResetSent(true);
      }, 1500);
    }
  };

  const handleBackToLogin = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? Colors.dark : Colors.light }
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
        >
          <View style={styles.formContainer}>
            {/* Logo */}
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
              {resetSent ? 'Check Your Email' : 'Forgot Password?'}
            </Text>
            
            <Text style={[
              styles.subtitle,
              { color: isDarkMode ? Colors.gray : Colors.textSecondary }
            ]}>
              {resetSent 
                ? 'Password reset instructions have been sent to your email.' 
                : 'Enter your email to receive password reset instructions'}
            </Text>

            {!resetSent ? (
              <>
                <View style={styles.inputContainer}>
                  <InputField
                    label="Email ID"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (emailError) setEmailError('');
                    }}
                    error={emailError}
                  />
                </View>

                <Button
                  title="Submit"
                  onPress={handleSubmit}
                  loading={loading}
                  disabled={!email}
                  style={styles.submitButton}
                />

                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={handleBackToLogin}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.backText,
                    { color: Colors.primary }
                  ]}>
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Button
                title="Back to Login"
                onPress={handleBackToLogin}
                style={styles.submitButton}
              />
            )}
          </View>
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
  },
  formContainer: {
    padding: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 96,
    marginTop: 20,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logo: {
    width: 200,
    height: 80,
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  submitButton: {
    marginBottom: 8,
  },
});

export default ForgotPasswordScreen;