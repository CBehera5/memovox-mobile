import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  memberCount?: number;
  isGroupMode?: boolean;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
  onAddMember?: () => void;
}

export default function ChatHeader({
  title,
  subtitle,
  memberCount,
  isGroupMode = false,
  onNotificationPress,
  onMenuPress,
  onAddMember,
}: ChatHeaderProps) {
  const router = useRouter();

  return (
    <>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#EC4899', '#A855F7', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {(subtitle || memberCount) && (
              <Text style={styles.subtitle}>
                {subtitle || (memberCount ? `${memberCount} members + Jeetu` : '')}
              </Text>
            )}
          </View>

          {/* Right Icons */}
          <View style={styles.rightIcons}>
            {/* Add Member Button - Only in group mode */}
            {isGroupMode && onAddMember && (
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={onAddMember}
              >
                <Ionicons name="person-add" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onNotificationPress}
            >
              <View style={styles.notificationBadge}>
                <Ionicons name="notifications" size={22} color="#fff" />
                <View style={styles.badgeDot} />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={onMenuPress}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
