// Test script for AgentService
// Run with: node test-agent-service.js

const { AgentService } = require('./src/services/AgentService');

// Mock data for testing
const mockMemo = {
  id: 'test-memo-1',
  userId: 'test-user-123',
  title: 'Team Meeting Notes',
  transcription: 'We need to prepare the Q4 presentation by Friday. John will handle the data analysis, Sarah will create the slides, and I need to review everything by Thursday evening.',
  category: 'Work',
  type: 'note',
  audioUrl: 'file://test.m4a',
  duration: 45,
  createdAt: new Date().toISOString(),
  aiAnalysis: {
    sentiment: 'neutral',
    keywords: ['presentation', 'Q4', 'Friday', 'data analysis', 'review'],
    summary: 'Plan Q4 presentation with team responsibilities',
    actionItems: ['Prepare Q4 presentation', 'Review everything Thursday'],
    suggestedFollowUps: ['Follow up with John', 'Check with Sarah']
  }
};

async function testAgentService() {
  console.log('🧪 Testing AgentService...\n');
  
  try {
    // Test 1: Suggest Actions
    console.log('📋 Test 1: Suggesting Actions from Memo');
    console.log('Input Memo:', mockMemo.title);
    console.log('Transcription:', mockMemo.transcription.substring(0, 100) + '...');
    
    const suggestions = await AgentService.suggestActions(mockMemo);
    console.log('\n✅ Suggestions Generated:');
    suggestions.forEach((suggestion, index) => {
      console.log(`\n${index + 1}. ${suggestion.action.title}`);
      console.log(`   Type: ${suggestion.action.type}`);
      console.log(`   Priority: ${suggestion.action.priority}`);
      console.log(`   Due: ${suggestion.action.dueDate} at ${suggestion.action.dueTime || 'any time'}`);
      console.log(`   Reason: ${suggestion.reason}`);
      console.log(`   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    });
    
    // Test 2: Create Action
    if (suggestions.length > 0) {
      console.log('\n\n📝 Test 2: Creating Action from Suggestion');
      const firstSuggestion = suggestions[0];
      const createdAction = await AgentService.createAction(
        firstSuggestion.action,
        mockMemo.userId
      );
      console.log('✅ Action Created:');
      console.log('   ID:', createdAction.id);
      console.log('   Title:', createdAction.title);
      console.log('   Status:', createdAction.status);
      console.log('   Created At:', new Date(createdAction.createdAt).toLocaleString());
    }
    
    // Test 3: Get User Actions
    console.log('\n\n📚 Test 3: Retrieving User Actions');
    const userActions = await AgentService.getUserActions(mockMemo.userId);
    console.log(`✅ Found ${userActions.length} action(s) for user`);
    userActions.forEach((action, index) => {
      console.log(`\n${index + 1}. ${action.title}`);
      console.log(`   Status: ${action.status}`);
      console.log(`   Type: ${action.type}`);
    });
    
    // Test 4: Get Today's Actions
    console.log('\n\n📅 Test 4: Getting Today\'s Actions');
    const todayActions = await AgentService.getTodayActions(mockMemo.userId);
    console.log(`✅ Found ${todayActions.length} action(s) due today`);
    todayActions.forEach(action => {
      console.log(`   - ${action.title} (${action.priority} priority)`);
    });
    
    // Test 5: Complete Action
    if (userActions.length > 0) {
      console.log('\n\n✓ Test 5: Completing an Action');
      const actionToComplete = userActions[0];
      const completedAction = await AgentService.completeAction(
        actionToComplete.id,
        mockMemo.userId
      );
      console.log('✅ Action Completed:');
      console.log('   Title:', completedAction.title);
      console.log('   Status:', completedAction.status);
      console.log('   Completed At:', new Date(completedAction.completedAt).toLocaleString());
    }
    
    // Test 6: Get Completion Stats
    console.log('\n\n📊 Test 6: Getting Completion Statistics');
    const stats = await AgentService.getCompletionStats(mockMemo.userId);
    console.log('✅ Completion Stats:');
    console.log(`   Total Tasks: ${stats.totalTasks}`);
    console.log(`   Completed: ${stats.completedTasks}`);
    console.log(`   Percentage: ${stats.percentage.toFixed(1)}%`);
    console.log(`   Trend: ${stats.trend}`);
    console.log(`   Weekly Completion: ${stats.weeklyCompletion}%`);
    console.log(`   Monthly Completion: ${stats.monthlyCompletion}%`);
    
    // Test 7: Get Overdue Actions
    console.log('\n\n⚠️  Test 7: Getting Overdue Actions');
    const overdueActions = await AgentService.getOverdueActions(mockMemo.userId);
    console.log(`✅ Found ${overdueActions.length} overdue action(s)`);
    overdueActions.forEach(action => {
      console.log(`   - ${action.title} (Due: ${action.dueDate})`);
    });
    
    console.log('\n\n🎉 All Tests Completed Successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run tests
console.log('═══════════════════════════════════════════════════════');
console.log('        AgentService Integration Test Suite');
console.log('═══════════════════════════════════════════════════════\n');

testAgentService().then(() => {
  console.log('Test suite finished.');
  process.exit(0);
}).catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
