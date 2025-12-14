# 🚀 AI Agent Enhancement Implementation Plan

## Overview
Transform MemoVox into an intelligent AI agent that can create tasks, manage calendar events, and proactively assist users.

---

## Feature 1: AI Agent Chat with Action Capabilities

### Current State:
- Chat window shows insights
- AI provides recommendations
- No action creation

### Target State:
- AI analyzes memos and suggests actions
- Can create reminders with user permission
- Can create calendar events with user permission
- Agent-like interaction flow

### Implementation:

#### 1.1 Update Types (`src/types/index.ts`)
```typescript
// Add new types
export interface AgentAction {
  id: string;
  type: 'reminder' | 'calendar_event' | 'task';
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  createdFrom: string; // memo ID
  createdAt: string;
  completedAt?: string;
}

export interface AgentSuggestion {
  action: AgentAction;
  reason: string;
  confidence: number; // 0-1
}

// Update VoiceMemo
export interface VoiceMemo {
  // ...existing fields
  linkedActions?: string[]; // IDs of created actions
  isCompleted?: boolean;
  completedAt?: string;
}
```

#### 1.2 Create Agent Service (`src/services/AgentService.ts`)
```typescript
class AgentService {
  // Analyze memo and suggest actions
  async suggestActions(memo: VoiceMemo): Promise<AgentSuggestion[]>
  
  // Create action with user permission
  async createAction(action: AgentAction, userId: string): Promise<AgentAction>
  
  // Get all actions for user
  async getUserActions(userId: string): Promise<AgentAction[]>
  
  // Complete an action
  async completeAction(actionId: string): Promise<void>
  
  // Get today's actions
  async getTodayActions(userId: string): Promise<AgentAction[]>
  
  // Calculate completion percentage
  async getCompletionStats(userId: string): Promise<{
    total: number;
    completed: number;
    percentage: number;
  }>
}
```

#### 1.3 Update Chat Service
- Add agent action suggestions to chat
- Handle permission requests
- Create actions from chat

---

## Feature 2: Mark Complete Functionality

### Implementation:

#### 2.1 Update VoiceMemoService
```typescript
async markMemoComplete(memoId: string, userId: string): Promise<void>
async unmarkMemoComplete(memoId: string, userId: string): Promise<void>
```

#### 2.2 Update UI Components
- Add "Mark Complete" button to memo cards
- Add checkbox icon
- Update visual state (strikethrough, opacity)
- Remove from active lists when completed

---

## Feature 3: Smart Home Page

### Current "Needs Your Attention" Section:
- Shows recent memos

### Target "Needs Your Attention" Section:
1. **Today's Tasks** (Priority 1)
   - Events scheduled for today
   - Reminders due today
   
2. **Smart Suggestions** (Priority 2, when no tasks for today)
   - High priority incomplete tasks
   - Old tasks not acted upon (7+ days)
   - Tasks from frequently accessed categories

### Implementation:

#### 3.1 Smart Task Selection Algorithm
```typescript
interface SmartTask {
  memo: VoiceMemo;
  reason: string;
  priority: number;
}

async function getSmartTasks(userId: string): Promise<SmartTask[]> {
  // 1. Get today's scheduled tasks
  const todayTasks = getTodayScheduledTasks();
  if (todayTasks.length > 0) return todayTasks;
  
  // 2. Get high priority incomplete tasks
  const highPriority = getHighPriorityTasks();
  if (highPriority.length > 0) return highPriority;
  
  // 3. Get old unacted tasks (7+ days)
  const oldTasks = getOldUnactedTasks();
  if (oldTasks.length > 0) return oldTasks;
  
  // 4. Get tasks from frequent categories
  return getFrequentCategoryTasks();
}
```

#### 3.2 Add Calendar View to Home
- Mini calendar widget
- Show dots for days with tasks
- Tap to see tasks for that day

---

## Feature 4: Task Completion Percentage

### Display on Home Page:
- Circular progress indicator
- "X% tasks completed"
- Weekly/Monthly stats

### Calculation:
```typescript
interface CompletionStats {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}
```

---

## File Structure

### New Files to Create:
```
src/services/
  ├── AgentService.ts          (NEW - AI agent actions)
  ├── TaskService.ts           (NEW - Task management)
  └── CalendarService.ts       (NEW - Calendar integration)

src/components/
  ├── TaskCard.tsx             (NEW - Task display)
  ├── CompletionRing.tsx       (NEW - Progress indicator)
  ├── CalendarWidget.tsx       (NEW - Mini calendar)
  └── AgentSuggestion.tsx      (NEW - Action suggestions)
```

### Files to Modify:
```
src/types/index.ts              (Add new types)
src/services/VoiceMemoService.ts (Add mark complete)
app/(tabs)/home.tsx             (Add calendar + stats)
app/(tabs)/chat.tsx             (Add agent actions)
app/(tabs)/list.tsx             (Add mark complete button)
```

---

## UI/UX Flow

### Chat Flow with Agent Actions:
```
User: "Show me insights for this memo"
AI: "Based on your memo about calling the dentist, I suggest:

    📅 Create Calendar Event
    • Title: Dentist Appointment
    • Date: Tomorrow at 4pm
    • Priority: Medium
    
    Would you like me to create this event?"
    
User: [Yes] [No] [Modify]

AI: "✅ Calendar event created! I'll remind you tomorrow."
```

### Home Page New Layout:
```
┌─────────────────────────────────────┐
│ Good morning, [Name]! 👋            │
│ 📊 75% tasks completed this week    │
├─────────────────────────────────────┤
│ 📅 Calendar                         │
│ [Mini Calendar Widget]              │
│ • 3 tasks today                     │
├─────────────────────────────────────┤
│ ⚠️ Needs Your Attention             │
│                                     │
│ ☑️ Call dentist - Today at 4pm     │
│    [Mark Complete]                  │
│                                     │
│ ☑️ Buy groceries - Due today       │
│    [Mark Complete]                  │
│                                     │
│ ☑️ Team meeting - From 7 days ago  │
│    (Suggested: High priority)       │
└─────────────────────────────────────┘
```

---

## Implementation Priority

### Phase 1 (Core Functionality):
1. ✅ Add `isCompleted` field to VoiceMemo type
2. ✅ Create AgentService with basic actions
3. ✅ Add mark complete functionality
4. ✅ Update home page to show today's tasks

### Phase 2 (Agent Intelligence):
5. ✅ Add AI suggestions in chat
6. ✅ Implement permission flow
7. ✅ Create actions from chat
8. ✅ Link actions to memos

### Phase 3 (Smart Features):
9. ✅ Implement smart task selection
10. ✅ Add completion percentage
11. ✅ Add calendar widget
12. ✅ Add calendar integration

---

## API Integration

### Required:
- ✅ Groq LLM (Already working) - For AI suggestions
- ❓ Calendar API - React Native Calendar or Expo Calendar
- ❓ Notifications - Expo Notifications (for reminders)

---

## Testing Checklist

### Agent Actions:
- [ ] AI suggests relevant actions from memos
- [ ] Permission dialog appears before creation
- [ ] Actions are created correctly
- [ ] Actions link back to original memo
- [ ] Actions appear in calendar/reminders

### Mark Complete:
- [ ] Mark complete button appears on tasks
- [ ] Completed tasks show visual indication
- [ ] Completed tasks removed from active lists
- [ ] Can undo completion

### Smart Home:
- [ ] Today's tasks show first
- [ ] Old tasks appear when no today tasks
- [ ] Priority tasks show correctly
- [ ] Calendar displays tasks

### Stats:
- [ ] Completion percentage calculates correctly
- [ ] Updates in real-time
- [ ] Shows trend

---

## Next Steps

1. **Approve this plan** - Review and confirm approach
2. **Start Phase 1** - Core types and mark complete
3. **Build Agent Service** - AI action generation
4. **Update UI** - Home page enhancements
5. **Test thoroughly** - Each feature
6. **Build APK** - Production ready

---

**Estimated Time:**
- Phase 1: 30-45 minutes
- Phase 2: 45-60 minutes  
- Phase 3: 30-45 minutes
- **Total: 2-3 hours**

**Ready to start implementation?** 🚀
