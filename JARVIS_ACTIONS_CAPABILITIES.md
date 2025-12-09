# 🤖 JARVIS AI Action Capabilities

## Overview

JARVIS (your AI companion) is now capable of taking real actions in response to your natural language requests. Ask JARVIS to set reminders, alarms, create calendar events, or manage tasks - and it will actually execute them!

---

## Capabilities

### 1. 📌 Reminders
**What it does:** Sets reminders for you with notifications at specified times

**Example requests:**
- "Remind me to call my mother tomorrow at 2pm"
- "Set a reminder for the team meeting in 30 minutes"
- "Remind me to pick up groceries this evening"

**What happens:**
- JARVIS parses the request
- Creates a reminder with title & description
- Schedules a push notification
- Stores reminder locally
- You get notified at the specified time

---

### 2. ⏰ Alarms
**What it does:** Sets alarms for wake-ups or time-critical tasks

**Example requests:**
- "Set an alarm for 6:30 AM"
- "Wake me up at 7am tomorrow"
- "Alarm for morning standup at 9am"

**What happens:**
- JARVIS extracts the time
- Creates an alarm with sound enabled
- Schedules notification with default alarm sound
- Stores in alarms list
- Notification triggers at exact time

---

### 3. 🔔 Push Notifications
**What it does:** Sends you notifications at specific times or immediately

**Example requests:**
- "Send me a notification to take a break in 20 minutes"
- "Notify me about the important email in 1 hour"
- "Send a notification right now about the deadline"

**What happens:**
- JARVIS schedules or sends notification immediately
- You see alert on phone
- Can tap to take action

---

### 4. 📅 Calendar Events
**What it does:** Creates calendar events with automatic reminders

**Example requests:**
- "Schedule a meeting with the team next Monday at 10am"
- "Create an event for Sarah's birthday on December 15th"
- "Add lunch date with Mike on Friday at 12pm"

**What happens:**
- JARVIS creates calendar event
- Sets 15-minute reminder before event
- Stores in calendar
- Notification sent before event starts

---

### 5. ✅ Tasks
**What it does:** Creates task items with priority levels

**Example requests:**
- "Create a task to review the proposal"
- "Add finishing the report to my tasks as high priority"
- "Task: Call client about the quote"

**What happens:**
- JARVIS creates task
- Assigns priority based on urgency indicators
- Stores in task list
- You can track completion later

---

## How It Works

### Step 1: Natural Language Processing
```
User: "Remind me to call my mom tomorrow at 3pm"
                        ↓
JARVIS analyzes your request using AI
                        ↓
```

### Step 2: Action Detection & Extraction
```
AI recognizes:
- Action type: reminder
- Title: "Call mom"
- Due time: tomorrow at 3pm
- Priority: medium
                        ↓
```

### Step 3: Time Parsing
```
JARVIS converts natural language times:
- "tomorrow at 3pm" → 2025-12-09 15:00
- "in 30 minutes" → current time + 30 mins
- "next Monday" → next Monday at 9am
- "6am" → tomorrow at 6am (if past today)
                        ↓
```

### Step 4: Action Execution
```
JARVIS executes the action:
- Stores reminder/alarm/task
- Schedules notification
- Returns confirmation
                        ↓
```

### Step 5: Confirmation
```
JARVIS tells you: "✓ Reminder set: Call mom at 3:00 PM tomorrow"
You see confirmation in chat
```

---

## Time Format Support

JARVIS understands natural language time expressions:

### Relative Times
- "in 5 minutes" → Current time + 5 minutes
- "in 2 hours" → Current time + 2 hours
- "in 3 days" → 3 days from now at 9am
- "tomorrow" → Tomorrow at 9am (default)
- "next week" → Next week, same day at 9am

### Specific Times
- "3pm" → 15:00 today (or tomorrow if past)
- "7:30am" → 07:30 today (or tomorrow if past)
- "15:45" → 15:45 in 24-hour format

### Days of Week
- "Monday" → Next Monday at 9am
- "next Tuesday" → Next Tuesday at 9am
- "Friday evening" → Friday at 5pm
- "Saturday morning" → Saturday at 9am

### Full Examples
- "tomorrow at 2pm"
- "next Wednesday at 10:30am"
- "in 45 minutes"
- "Monday evening"

---

## Chat Integration

### Example Conversation

```
You: "Remind me to call my mother"

JARVIS: "✓ Reminder set: Call mother"
        "When would you like to be reminded?"

You: "Tomorrow at 3pm"

JARVIS: "✓ Reminder set: Call mother at 3:00 PM tomorrow"
        "I'll send you a notification at that time."
```

---

## Technical Details

### Services Involved

1. **ActionService** (`src/services/ActionService.ts`)
   - Parses user requests using Groq AI
   - Extracts action type, title, time, priority
   - Executes actions and manages notifications

2. **StorageService** (`src/services/StorageService.ts`)
   - Persists reminders, alarms, tasks, events
   - Retrieves stored actions
   - Manages local storage with AsyncStorage

3. **Notifications** (expo-notifications)
   - Schedules push notifications
   - Handles sound, timing, delivery

4. **ChatService** (`src/services/ChatService.ts`)
   - Manages conversation context
   - Passes messages to ActionService
   - Returns execution results

---

## Data Persistence

All actions are stored locally using AsyncStorage:

```typescript
// Reminders
Key: 'memovox_reminders'
Value: [{id, title, description, dueTime, priority, completed}, ...]

// Alarms
Key: 'memovox_alarms'
Value: [{id, title, description, alarmTime, enabled}, ...]

// Calendar Events
Key: 'memovox_calendar_events'
Value: [{id, title, description, startTime, endTime}, ...]

// Tasks
Key: 'memovox_tasks'
Value: [{id, title, description, dueDate, priority, completed}, ...]
```

Data survives app restarts and is available across sessions.

---

## Error Handling

If JARVIS can't understand your request:
```
You: "Set a thing for xyz time"

JARVIS: "I couldn't detect a clear action in your request. 
        Could you be more specific? 
        For example:
        - 'Remind me to...'
        - 'Set an alarm for...'
        - 'Schedule a meeting...'
        - 'Create a task to...'"
```

---

## Conversation Flow Example

### Multi-Step Action

```
You: "I need to call the bank"

JARVIS: "I can help! When would you like to be reminded?
        For example:
        - Tomorrow at 10am
        - In 1 hour
        - Monday morning"

You: "Tomorrow at 10am"

JARVIS: "✓ Reminder set: Call the bank at 10:00 AM tomorrow
        I'll send you a notification at that time."

[Tomorrow at 10am - Notification pops up with reminder]
```

---

## Features

✅ **AI-Powered Parsing** - Understands natural language like a human
✅ **Flexible Time Formats** - Accept any way you say the time
✅ **Auto Notifications** - Reminders trigger at right time
✅ **Persistent Storage** - Survives app restarts
✅ **Priority Levels** - High/medium/low task priorities
✅ **Error Recovery** - Clear feedback if understanding fails
✅ **Confirmation** - Always tells you what was created

---

## Roadmap (Future)

- [ ] Cross-device sync (cloud backup of reminders)
- [ ] Recurring reminders (daily, weekly, monthly)
- [ ] Smart suggestions ("You usually call mom on Sundays")
- [ ] Integration with native calendar app
- [ ] Voice response from JARVIS ("Your reminder has been set")
- [ ] Habit tracking (reminders you've completed)
- [ ] Rich notifications with action buttons
- [ ] Time zone support
- [ ] Natural language event details ("meeting with Bob")

---

## Example Requests JARVIS Understands

```
Reminders:
✓ "Remind me to pay the bill"
✓ "Set a reminder for the dentist appointment tomorrow"
✓ "Remind me to water plants in 2 hours"
✓ "Remind me about the presentation at 9am"

Alarms:
✓ "Set an alarm for 6:30am"
✓ "Wake me up at 7am tomorrow"
✓ "Alarm for morning standup"

Notifications:
✓ "Send me a notification in 30 minutes"
✓ "Notify me about the email in 1 hour"
✓ "Push notification right now"

Calendar:
✓ "Schedule a meeting next Monday at 2pm"
✓ "Create an event for the conference next month"
✓ "Add lunch date with Sarah on Friday"

Tasks:
✓ "Create a task to finish the project"
✓ "Add reviewing the proposal as a high-priority task"
✓ "Task: Call the vendor today"
```

---

## Status

✅ **IMPLEMENTED & WORKING**
- ActionService fully functional
- Time parsing with natural language support
- All 5 action types working
- Storage and persistence working
- Integration ready for chat.tsx

---

**Version:** 1.0 JARVIS Action Capabilities
**Date:** December 8, 2025
**Status:** ✅ PRODUCTION READY
