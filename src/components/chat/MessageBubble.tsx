import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export type MessageType = 'sent' | 'received' | 'ai';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  type: MessageType;
  senderName?: string;
  senderAvatar?: string;
  isFirstInGroup?: boolean;
  imageUri?: string;
}

export default function MessageBubble({
  content,
  timestamp,
  type,
  senderName,
  senderAvatar,
  isFirstInGroup = true,
  imageUri,
}: MessageBubbleProps) {
  const isSent = type === 'sent';
  const isAI = type === 'ai';

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Sent message (right-aligned, lighter color)
  if (isSent) {
    return (
      <View style={styles.sentContainer}>
        <View style={styles.sentBubble}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.messageImage} />
          )}
          <Text style={styles.sentText}>{content}</Text>
          <Text style={styles.sentTimestamp}>{formatTime(timestamp)}</Text>
        </View>
      </View>
    );
  }

  // Received or AI message (left-aligned with avatar)
  return (
    <View style={styles.receivedContainer}>
      {/* Avatar */}
      {isFirstInGroup && (
        <View style={styles.avatarContainer}>
          {isAI ? (
            <LinearGradient
              colors={['#8B5CF6', '#6366F1']}
              style={styles.aiAvatar}
            >
              <Ionicons name="sparkles" size={16} color="#fff" />
            </LinearGradient>
          ) : senderAvatar ? (
            <Image source={{ uri: senderAvatar }} style={styles.avatar} />
          ) : (
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarInitial}>
                {senderName?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
      )}
      {!isFirstInGroup && <View style={styles.avatarPlaceholder} />}

      {/* Bubble */}
      <LinearGradient
        colors={isAI ? ['#818CF8', '#6366F1'] : ['#A855F7', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.receivedBubble}
      >
        {isFirstInGroup && senderName && (
          <Text style={styles.senderName}>
            {isAI ? '✨ Jeetu (AI)' : `*${senderName}`}
          </Text>
        )}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.messageImage} />
        )}
        <Text style={styles.receivedText}>{content}</Text>
        <Text style={styles.receivedTimestamp}>{formatTime(timestamp)}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  // Sent message styles
  sentContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  sentBubble: {
    maxWidth: '75%',
    backgroundColor: '#E9D5FF',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  sentText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  sentTimestamp: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'right',
  },

  // Received message styles
  receivedContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingHorizontal: 12,
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 36,
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  defaultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D946EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receivedBubble: {
    maxWidth: '75%',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  receivedText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 22,
  },
  receivedTimestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'right',
  },

  // Image in message
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
});
