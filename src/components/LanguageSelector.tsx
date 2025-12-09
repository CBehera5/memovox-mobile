// Example Language Selector Component
// This can be added to the settings/profile screen

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import LanguageService, { SUPPORTED_LANGUAGES, SupportedLanguage } from '../services/LanguageService';

interface LanguageSelectorProps {
  onLanguageChange?: (language: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onLanguageChange }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    LanguageService.getCurrentLanguage()
  );

  const handleSelectLanguage = async (language: SupportedLanguage) => {
    setSelectedLanguage(language);
    await LanguageService.setLanguage(language);
    
    if (onLanguageChange) {
      onLanguageChange(language);
    }
  };

  const languages = LanguageService.getAllLanguages();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Language</Text>
      <Text style={styles.subtitle}>Choose your preferred language</Text>
      
      <ScrollView style={styles.languageList}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageOption,
              selectedLanguage === lang.code && styles.languageOptionSelected,
            ]}
            onPress={() => handleSelectLanguage(lang.code)}
          >
            <View style={styles.languageContent}>
              <Text style={styles.languageName}>{lang.name}</Text>
              <Text style={styles.nativeName}>{lang.nativeName}</Text>
            </View>
            
            {selectedLanguage === lang.code && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Current Language</Text>
        <Text style={styles.infoText}>
          {SUPPORTED_LANGUAGES[selectedLanguage].name} ({SUPPORTED_LANGUAGES[selectedLanguage].nativeName})
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  languageList: {
    flex: 1,
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  languageContent: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  nativeName: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  infoTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default LanguageSelector;
