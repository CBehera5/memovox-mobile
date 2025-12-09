# 📱 Notification System - Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER RECORDS MEMO                          │
│                   "meeting tomorrow 3pm"                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIO TRANSCRIPTION                          │
│              (Groq Whisper API converts speech)                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      AI ANALYSIS                                │
│  (Groq LLM extracts: type=event, time=3pm, date=tomorrow)      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SAVE MEMO TO DATABASE                        │
│         (Supabase: voice_memos table + audio storage)           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│            CREATE NOTIFICATION (NotificationService)           │
│                                                                 │
│  if (memo.type === 'event') {                                  │
│    createEventNotification(memo)  ← 1 hour before event        │
│  }                                                              │
│  if (memo.type === 'reminder') {                               │
│    createReminderNotification(memo) ← at reminder time         │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         SCHEDULE WITH EXPO NOTIFICATIONS API                    │
│                                                                 │
│  Notifications.scheduleNotificationAsync({                      │
│    content: { title, body, data },                              │
│    trigger: { scheduledDate: tomorrow 2pm }                     │
│  })                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         STORE LOCALLY (AsyncStorage)                            │
│                                                                 │
│  {                                                              │
│    id: "event_123_456",                                         │
│    title: "📅 Upcoming Event",                                  │
│    body: "meeting tomorrow",                                    │
│    scheduledFor: "2025-12-07T14:00:00.000Z",                   │
│    sent: false                                                  │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│         WAIT FOR SCHEDULED TIME (OS MANAGED)                    │
│                                                                 │
│  Tomorrow 2:00pm → OS triggers notification                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│     DELIVER PUSH NOTIFICATION TO USER                           │
│                                                                 │
│  ┌────────────────────────────────────────────┐                │
│  │ 📅 Upcoming Event                          │  ← Lock Screen │
│  │ meeting tomorrow                           │                │
│  └────────────────────────────────────────────┘                │
│       ↓ (User Taps)                                             │
│  App Opens → Shows Memo Details                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Notification Types Flow

### Flow 1: Event Notifications

```
User Says Something with Date/Time
           ↓
   Contains: "tomorrow", "3pm", "meeting"
           ↓
  Analysis Extracts:
  ├─ type: "event"
  ├─ eventDate: "2025-12-07"
  ├─ eventTime: "15:00"
  └─ title: "meeting"
           ↓
  createEventNotification()
           ↓
  Schedule for: eventDate - 1 hour
  (Tomorrow 2:00pm instead of 3pm)
           ↓
  Push Notification Delivered
  ┌─────────────────────┐
  │ 📅 Upcoming Event   │
  │ meeting             │
  └─────────────────────┘
```

### Flow 2: Reminder Notifications

```
User Says Task with Due Date
           ↓
   Contains: "remember", "pay", "bill", "friday"
           ↓
  Analysis Extracts:
  ├─ type: "reminder"
  ├─ reminderDate: "2025-12-12"
  └─ title: "pay the bill"
           ↓
  createReminderNotification()
           ↓
  Schedule for: reminderDate at time
  (Friday at specified hour)
           ↓
  Push Notification Delivered
  ┌──────────────────────────┐
  │ ⏰ Reminder              │
  │ pay the bill             │
  └──────────────────────────┘
```

### Flow 3: Follow-up Notifications

```
App/User Requests Follow-up
           ↓
   Input: followUpText, daysFromNow
           ↓
  createFollowUpNotification(memo, text, 7)
           ↓
  Calculate: today + 7 days
           ↓
  Schedule for: followUpDate
           ↓
  Push Notification Delivered
  ┌──────────────────────────┐
  │ 💡 Follow-up Suggestion  │
  │ [custom text]            │
  └──────────────────────────┘
```

### Flow 4: Insight Notifications

```
App Generates Personalized Insight
           ↓
   Analyzes user's memos
           ↓
  createInsightNotification(userId, insight)
           ↓
  Schedule for: immediately
           ↓
  Push Notification Delivered
  ┌──────────────────────────┐
  │ ✨ MemoVox Insight       │
  │ "You've been productive" │
  └──────────────────────────┘
```

---

## Data Flow Diagram

```
NotificationService
├── scheduleNotification(notification)
│   ├─ Check platform (iOS/Android/Web)
│   ├─ Validate date
│   ├─ Call Notifications.scheduleNotificationAsync()
│   └─ Return notificationId
│
├── createEventNotification(memo)
│   ├─ Validate memo.type === 'event'
│   ├─ Extract eventDate and eventTime
│   ├─ Calculate reminderDate (1 hour before)
│   ├─ Create Notification object
│   ├─ Save to AsyncStorage
│   └─ Call scheduleNotification()
│
├── createReminderNotification(memo)
│   ├─ Validate memo.type === 'reminder'
│   ├─ Extract reminderDate
│   ├─ Validate date is valid
│   ├─ Create Notification object
│   ├─ Save to AsyncStorage
│   └─ Call scheduleNotification()
│
├── createFollowUpNotification(memo, text, days)
│   ├─ Calculate followUpDate (today + days)
│   ├─ Create Notification object
│   ├─ Save to AsyncStorage
│   └─ Call scheduleNotification()
│
├── createInsightNotification(userId, insight)
│   ├─ Create Notification object
│   ├─ Save to AsyncStorage
│   └─ Call scheduleNotification()
│
├── cancelNotification(id)
│   └─ Call Notifications.cancelScheduledNotificationAsync(id)
│
├── getPendingNotifications()
│   └─ Return Notifications.getAllScheduledNotificationsAsync()
│
├── setupNotificationListener(callback)
│   └─ addNotificationReceivedListener() - foreground
│
└── setupNotificationResponseListener(callback)
    └─ addNotificationResponseReceivedListener() - user taps
```

---

## Notification Object Structure

```typescript
{
  id: string;                    // Unique identifier
  userId: string;                // User who gets notification
  memoId: string;                // Related memo ID
  type: 'event' | 'reminder' | 'followup' | 'insight';
  title: string;                 // Display title with emoji
  body: string;                  // Notification message
  scheduledFor: string;          // ISO date string when to show
  sent: boolean;                 // Whether notification was delivered
  createdAt: string;             // When notification was created
}

// Example:
{
  id: "event_123_1733565600000",
  userId: "user-uuid-123",
  memoId: "memo-uuid-456",
  type: "event",
  title: "📅 Upcoming Event",
  body: "meeting with john",
  scheduledFor: "2025-12-07T14:00:00.000Z",
  sent: false,
  createdAt: "2025-12-06T08:30:00.000Z"
}
```

---

## Notification Lifecycle

```
1. CREATION
   └─ createEventNotification() / createReminderNotification()
      └─ Create Notification object

2. STORAGE
   └─ Save to AsyncStorage
      └─ Persisted locally

3. SCHEDULING
   └─ Call Expo Notifications API
      └─ notificationId returned

4. WAITING
   └─ OS waits for scheduled time
      └─ (user can close app, device can sleep)

5. DELIVERY
   └─ At scheduled time, OS triggers notification
      └─ User sees on lock screen

6. INTERACTION
   └─ User taps notification
      └─ App opens to memo details

7. CLEANUP
   └─ Mark sent: true
      └─ Or call cancelNotification()
```

---

## Validation Flow

```
Input: memo.metadata.eventDate
   ↓
┌──────────────────────────┐
│ isNaN(date.getTime())?   │
├──────────────────────────┤
│ NO → Valid date ✅       │
│ YES → Invalid date ❌    │
└──────────────────────────┘
   ↓
Valid:    Schedule notification
Invalid:  Log warning & skip (no crash!)
```

---

## Platform Handling

```
                    NotificationService.scheduleNotification()
                              ↓
                    ┌─────────────────────┐
                    │ Platform.OS check   │
                    └─────────────────────┘
                      ↙              ↘
                   iOS/Android        Web
                      ↓                ↓
              ┌──────────────┐  ┌─────────────┐
              │ Schedule     │  │ Skip        │
              │ with Expo    │  │ "Notifications
              │ Notification │  │  not available
              │ API          │  │  on web"
              └──────────────┘  └─────────────┘
                      ↓                ↓
              Notification sent   No notification
              to device OS        (graceful fail)
```

---

## Error Handling

```
createEventNotification(memo)
   ↓
Try {
   ├─ Check memo.type === 'event'
   ├─ Check memo.metadata?.eventDate exists
   ├─ Parse eventDate
   ├─ Validate: isNaN(eventDate.getTime())?
   │  └─ Invalid? → Log warning & return
   ├─ Calculate reminderDate
   ├─ Create Notification object
   ├─ Save to AsyncStorage
   └─ Schedule with Expo
}
Catch {
   └─ Log error (notification creation failed)
       (memo still saves successfully)
}
```

---

## Integration Points

```
record.tsx
├─ Import NotificationService
└─ After saving memo:
   ├─ If event → createEventNotification()
   └─ If reminder → createReminderNotification()

AIService.ts
└─ Returns analysis with:
   ├─ type: 'event' | 'reminder' | 'note'
   ├─ metadata.eventDate (if date mentioned)
   └─ metadata.eventTime (if time mentioned)

StorageService.ts
└─ Manages:
   ├─ Local notification storage (AsyncStorage)
   └─ Notification retrieval

NotificationService.ts
├─ Core notification logic
├─ Expo Notifications API integration
└─ Platform-specific handling
```

---

## Success Criteria ✅

- [x] Notifications created for events
- [x] Notifications created for reminders
- [x] Notifications scheduled at correct time
- [x] Date validation prevents crashes
- [x] Platform-specific handling (iOS/Android/Web)
- [x] Local persistence in AsyncStorage
- [x] Sound enabled
- [x] Badge count enabled
- [x] Banner/Alert enabled
- [x] User can tap to open memo
- [x] Handles invalid dates gracefully
- [x] Works when app is closed
- [x] Works when device is sleeping

---

## Ready for Production! 🚀

Push notification system is **fully integrated** and **working** on iOS and Android!

