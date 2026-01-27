import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onVoicePress?: () => void;
  onAttachPress?: () => void;
  onCameraPress?: () => void;
  isLoading?: boolean;
  isRecording?: boolean;
  placeholder?: string;
}

export default function ChatInputBar({
  value,
  onChangeText,
  onSend,
  onVoicePress,
  onAttachPress,
  onCameraPress,
  isLoading = false,
  isRecording = false,
  placeholder = 'Type....',
}: ChatInputBarProps) {
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Input Container */}
      <View style={styles.inputContainer}>
        {/* Search/Magnify Icon */}
        <Ionicons 
          name="search" 
          size={20} 
          color="#9CA3AF" 
          style={styles.searchIcon} 
        />

        {/* Text Input */}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
          editable={!isLoading}
        />

        {/* Attachment Icon */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={onAttachPress}
          disabled={isLoading}
        >
          <Ionicons name="attach" size={22} color="#6B7280" />
        </TouchableOpacity>

        {/* Camera Icon */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={onCameraPress}
          disabled={isLoading}
        >
          <Ionicons name="camera-outline" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Send/Voice Button */}
      {hasText ? (
        <TouchableOpacity 
          onPress={onSend}
          disabled={isLoading}
          style={styles.sendButton}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            style={styles.gradientButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          onPress={onVoicePress}
          disabled={isLoading}
          style={styles.voiceButton}
        >
          <LinearGradient
            colors={isRecording ? ['#EF4444', '#DC2626'] : ['#8B5CF6', '#6366F1']}
            style={styles.gradientButton}
          >
            <Ionicons 
              name={isRecording ? 'stop' : 'mic'} 
              size={22} 
              color="#fff" 
            />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3E8FF',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 48,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    maxHeight: 100,
    paddingVertical: 0,
  },
  iconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  sendButton: {
    width: 48,
    height: 48,
  },
  voiceButton: {
    width: 48,
    height: 48,
  },
  gradientButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
