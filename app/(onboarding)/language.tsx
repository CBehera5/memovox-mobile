import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check } from 'lucide-react-native';
import LanguageService, { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../src/services/LanguageService';
import { COLORS, GRADIENTS } from '../../src/constants';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function LanguageScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');

  const languages = Object.values(SUPPORTED_LANGUAGES);

  const handleSelect = async (lang: SupportedLanguage) => {
    setSelectedLang(lang);
    await Haptics.selectionAsync();
  };

  const handleContinue = async () => {
    await LanguageService.setLanguage(selectedLang);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(onboarding)/welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to MemoVox</Text>
        <Text style={styles.subtitle}>Choose your preferred language</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.card,
              selectedLang === lang.code && styles.cardSelected,
            ]}
            onPress={() => handleSelect(lang.code)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={[styles.nativeName, selectedLang === lang.code && styles.textSelected]}>
                {lang.nativeName}
              </Text>
              <Text style={[styles.name, selectedLang === lang.code && styles.textNameSelected]}>
                {lang.name}
              </Text>
            </View>
            {selectedLang === lang.code && (
              <View style={styles.checkCircle}>
                <Check size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleContinue} style={styles.buttonContainer}>
          <LinearGradient
            colors={GRADIENTS.primary as any}
            style={styles.button}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray[600],
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 56) / 2, // 2 columns
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    height: 110,
    justifyContent: 'center',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  cardContent: {
    alignItems: 'center',
  },
  nativeName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    color: COLORS.gray[500],
    fontWeight: '500',
  },
  textSelected: {
    color: COLORS.primary,
  },
  textNameSelected: {
    color: COLORS.primary,
  },
  checkCircle: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  buttonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
