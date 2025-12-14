// Test page for AgentService
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { runAgentServiceTest } from '../src/tests/testAgentService';
import { Stack } from 'expo-router';

export default function TestAgentScreen() {
  const [isRunning, setIsRunning] = useState(false);
  const [testOutput, setTestOutput] = useState<string[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestOutput(['Running tests...']);
    setHasRun(true);

    try {
      // Capture console.log output
      const originalLog = console.log;
      const logs: string[] = [];
      
      console.log = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(message);
        originalLog(...args);
      };

      await runAgentServiceTest();
      
      // Restore console.log
      console.log = originalLog;
      
      setTestOutput(logs);
    } catch (error) {
      setTestOutput([
        'Test Error:',
        error instanceof Error ? error.message : String(error),
        '',
        'Stack:',
        error instanceof Error && error.stack ? error.stack : 'No stack trace'
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'AgentService Test',
          headerStyle: { backgroundColor: '#667eea' },
          headerTintColor: '#fff',
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🧪 AgentService Test Suite</Text>
          <Text style={styles.subtitle}>
            Test AI-powered action suggestions, task management, and completion tracking
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isRunning && styles.buttonDisabled]}
          onPress={handleRunTests}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {hasRun ? '🔄 Run Tests Again' : '▶️  Run Tests'}
            </Text>
          )}
        </TouchableOpacity>

        {testOutput.length > 0 && (
          <ScrollView style={styles.output} contentContainerStyle={styles.outputContent}>
            {testOutput.map((line, index) => (
              <Text 
                key={index} 
                style={[
                  styles.outputLine,
                  line.includes('❌') && styles.errorLine,
                  line.includes('✅') && styles.successLine,
                  line.includes('🎉') && styles.celebrationLine,
                ]}
              >
                {line}
              </Text>
            ))}
          </ScrollView>
        )}

        {!hasRun && (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📋 What This Tests:</Text>
            <Text style={styles.infoText}>
              • AI-powered action suggestions from memos{'\n'}
              • Creating tasks, reminders, and calendar events{'\n'}
              • Retrieving user actions{'\n'}
              • Getting today's actions{'\n'}
              • Completing actions{'\n'}
              • Calculating completion statistics{'\n'}
              • Finding overdue actions
            </Text>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7ff',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#667eea',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  output: {
    flex: 1,
    backgroundColor: '#1e293b',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
  },
  outputContent: {
    paddingBottom: 20,
  },
  outputLine: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 18,
  },
  errorLine: {
    color: '#fca5a5',
    fontWeight: '600',
  },
  successLine: {
    color: '#86efac',
  },
  celebrationLine: {
    color: '#fbbf24',
    fontWeight: '700',
    fontSize: 16,
  },
  infoBox: {
    margin: 20,
    padding: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
  },
});
