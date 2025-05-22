import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
  useColorScheme
} from 'react-native';
import { Colors } from '../theme/Colors';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  labelStyle?: TextStyle;
  inputContainerStyle?: ViewStyle;
  showPasswordToggle?: boolean;
  secureTextEntry?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  containerStyle,
  labelStyle,
  inputContainerStyle,
  showPasswordToggle = false,
  secureTextEntry = false,
  ...props
}) => {
  const isDarkMode = false;
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[
          styles.label, 
          { color: isDarkMode ? Colors.gray : Colors.textSecondary },
          labelStyle
        ]}>
          {label}
        </Text>
      )}
      <View style={[
        styles.inputContainer,
        { 
          backgroundColor: '#FFFFFF',
          borderColor: isFocused ? Colors.primary : Colors.borderLight,
          borderWidth: 1,
        },
        inputContainerStyle
      ]}>
        <TextInput
          style={[
            styles.input,
            { 
              color: isDarkMode ? Colors.textLight : Colors.textPrimary,
            }
          ]}
          placeholderTextColor={isDarkMode ? Colors.gray : Colors.textTertiary}
          secureTextEntry={secureTextEntry && !showPassword}
          value={props.value}
          onChangeText={props.onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize={secureTextEntry ? 'none' : 'sentences'}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity 
            style={styles.passwordToggle}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={{ color: Colors.primary }}>
              {showPassword ? '•' : '👁️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  }
});

export default InputField;