import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';

interface MenuItem {
  icon: string;
  label: string;
  onPress: () => void;
  backgroundColor?: string;
  destructive?: boolean;
}

interface TaskMenuProps {
  menuItems: MenuItem[];
}

export default function TaskMenu({ menuItems }: TaskMenuProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const handleMenuPress = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setMenuVisible(true);
  };

  const handleItemPress = (onPress: () => void) => {
    setMenuVisible(false);
    // Small delay to let modal close animation complete
    setTimeout(onPress, 150);
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>⋯</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === 0 && styles.menuItemFirst,
                  index === menuItems.length - 1 && styles.menuItemLast,
                ]}
                onPress={() => handleItemPress(item.onPress)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuItemIconContainer,
                    { backgroundColor: item.backgroundColor || '#007AFF' },
                  ]}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                </View>
                <Text
                  style={[
                    styles.menuItemLabel,
                    item.destructive && styles.menuItemLabelDestructive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3C3C43',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    minWidth: 250,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  menuItemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  menuItemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemIcon: {
    fontSize: 18,
    lineHeight: 18,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  menuItemLabelDestructive: {
    color: '#FF3B30',
  },
});
