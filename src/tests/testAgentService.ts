// Test script for AgentService - React Native compatible
import AgentService from '../services/AgentService';
import { VoiceMemo } from '../types';

// Mock memo for testing
const mockMemo: VoiceMemo = {
  id: 'test-memo-1',
  userId: 'test-user-123',
  title: 'Team Meeting Notes',
  transcription: 'We need to prepare the Q4 presentation by Friday. John will handle the data analysis, Sarah will create the slides, and I need to review everything by Thursday evening.',
  category: 'Work',
  type: 'note',
  audioUri: 'file://test.m4a',
  duration: 45,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aiAnalysis: {
    sentiment: 'neutral',
    keywords: ['presentation', 'Q4', 'Friday', 'data analysis', 'review'],
    summary: 'Plan Q4 presentation with team responsibilities',
    actionItems: ['Prepare Q4 presentation', 'Review everything Thursday'],
    suggestedFollowUps: ['Follow up with John', 'Check with Sarah']
  }
};

export async function testAgentService(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];
  
  try {
    results.push('🧪 Testing AgentService...\n');
    
    // Test 1: Suggest Actions
    results.push('📋 Test 1: Suggesting Actions from Memo');
    results.push(`Input: "${mockMemo.title}"`);
    
    const suggestions = await AgentService.suggestActions(mockMemo);
    results.push(`✅ Generated ${suggestions.length} suggestion(s):`);
    
    suggestions.forEach((suggestion, index) => {
      results.push(`\n${index + 1}. ${suggestion.action.title}`);
      results.push(`   Type: ${suggestion.action.type}`);
      results.push(`   Priority: ${suggestion.action.priority}`);
      results.push(`   Due: ${suggestion.action.dueDate}`);
      results.push(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    });
    
    // Test 2: Create Action
    if (suggestions.length > 0) {
      results.push('\n📝 Test 2: Creating Action');
      const createdAction = await AgentService.createAction(
        suggestions[0].action,
        mockMemo.userId
      );
      results.push(`✅ Created: "${createdAction.title}"`);
      results.push(`   ID: ${createdAction.id}`);
      results.push(`   Status: ${createdAction.status}`);
    }
    
    // Test 3: Get User Actions
    results.push('\n📚 Test 3: Retrieving User Actions');
    const userActions = await AgentService.getUserActions(mockMemo.userId);
    results.push(`✅ Found ${userActions.length} action(s)`);
    
    // Test 4: Get Today's Actions
    results.push('\n📅 Test 4: Today\'s Actions');
    const todayActions = await AgentService.getTodayActions(mockMemo.userId);
    results.push(`✅ ${todayActions.length} action(s) due today`);
    
    // Test 5: Complete Action
    if (userActions.length > 0) {
      results.push('\n✓ Test 5: Completing Action');
      const completed = await AgentService.completeAction(
        userActions[0].id,
        mockMemo.userId
      );
      results.push(`✅ Completed: "${completed.title}"`);
      results.push(`   Status: ${completed.status}`);
    }
    
    // Test 6: Completion Stats
    results.push('\n📊 Test 6: Completion Statistics');
    const stats = await AgentService.getCompletionStats(mockMemo.userId);
    results.push(`✅ Stats:`);
    results.push(`   Total: ${stats.totalTasks}`);
    results.push(`   Completed: ${stats.completedTasks}`);
    results.push(`   Percentage: ${stats.percentage.toFixed(1)}%`);
    results.push(`   Trend: ${stats.trend}`);
    
    // Test 7: Overdue Actions
    results.push('\n⚠️  Test 7: Overdue Actions');
    const overdue = await AgentService.getOverdueActions(mockMemo.userId);
    results.push(`✅ ${overdue.length} overdue action(s)`);
    
    results.push('\n🎉 All Tests Passed!\n');
    
    return {
      success: true,
      results,
      errors
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(`❌ Test Failed: ${errorMsg}`);
    
    return {
      success: false,
      results,
      errors
    };
  }
}

// Quick test function for console output
export async function runAgentServiceTest(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('        AgentService Integration Test Suite');
  console.log('═══════════════════════════════════════════════════════\n');
  
  const testResults = await testAgentService();
  
  testResults.results.forEach(line => console.log(line));
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.errors.forEach(error => console.error(error));
  }
  
  console.log('\nTest suite finished.');
}
