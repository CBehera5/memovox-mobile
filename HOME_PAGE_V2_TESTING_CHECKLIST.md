# ✅ Home Page V2 - Testing Checklist

## 🎯 Pre-Testing Setup

- [ ] Device connected or emulator running
- [ ] App rebuilt with latest changes
- [ ] Test user account with sample data:
  - [ ] At least 5 AgentActions with different priorities
  - [ ] At least 2 tasks due today
  - [ ] Some completed tasks for progress ring
  - [ ] Some saved memos in Notes

---

## 🧪 Feature Testing

### 1. Carousel Functionality
- [ ] **Swipe Right**: Progress card → Today's Tasks card
- [ ] **Swipe Left**: Today's Tasks card → Progress card  
- [ ] **Pagination Dots**: 
  - [ ] Left dot active when on Progress card
  - [ ] Right dot active when on Today's Tasks card
- [ ] **Smooth Animation**: No lag or stuttering
- [ ] **Full Width**: Cards span entire screen width (minus padding)

### 2. Progress Card (Carousel Card 1)
- [ ] **Completion Ring**: Displays correct percentage
- [ ] **Stats Grid**: Shows "Done", "Pending", "Trend" 
- [ ] **Values Correct**: Numbers match actual task counts
- [ ] **Trend Icon**: Shows 📈 (up), 📉 (down), or ➡️ (stable)
- [ ] **Empty State**: When no tasks exist, shows message

### 3. Today's Tasks Card (Carousel Card 2)
- [ ] **Task List**: Shows up to 3 tasks due today
- [ ] **Priority Badge**: Color-coded (🔴 High, 🟠 Medium, 🟢 Low)
- [ ] **Task Title**: Displays correctly, truncates if long
- [ ] **Due Time**: Shows "Due: [time]" format
- [ ] **✓ Complete Button**: 
  - [ ] Tappable
  - [ ] Calls AgentService
  - [ ] Shows success alert
  - [ ] Removes task from view
  - [ ] Updates count
- [ ] **Empty State**: When nothing due today, shows "Nothing due today! 🎉"
- [ ] **Scrollable**: If more than 3 tasks, scroll works

### 4. Bulk Share Button
- [ ] **Visibility**: Only shows when allActions.length > 0
- [ ] **Location**: Below carousel, centered
- [ ] **Tap**: Opens native share dialog
- [ ] **Format**: 
  - [ ] Header: "📋 My Tasks (X total)"
  - [ ] Numbered list
  - [ ] Each task shows: title, priority, status, due date
  - [ ] Footer: "✨ Managed with MemoVox AI"
- [ ] **Share Works**: Can share to WhatsApp/Email/Messages

### 5. Priority Task List ("You might want to pay attention")
- [ ] **Header**: Shows section title + task count badge
- [ ] **Task Count**: Badge shows correct number (e.g., "5 tasks")
- [ ] **Sorting**:
  - [ ] Tasks with earlier due dates appear first
  - [ ] When dates equal, HIGH before MEDIUM before LOW
  - [ ] Tasks without dates appear at bottom
- [ ] **All Tasks Visible**: Not limited to 3 (scrollable)
- [ ] **Priority Badges**:
  - [ ] High: Red background (#FFEBEE)
  - [ ] Medium: Orange background (#FFF3E0)
  - [ ] Low: Green background (#E8F5E9)
- [ ] **Type Icons**: ✓ (task), 🔔 (reminder), 📅 (event)
- [ ] **Due Date Display**: Format "Due: Dec 12, 2025 at 2:00 PM"
- [ ] **Empty State**: When no actions, shows "No action items yet. Keep recording!"

### 6. Action Buttons (on each task)
#### ✓ Complete Button
- [ ] **Icon**: Green checkmark
- [ ] **Bounce Animation**: Visible bounce effect
- [ ] **Tap**: Marks task complete
- [ ] **Alert**: Shows "✅ Complete! '[task name]' is done!"
- [ ] **Refresh**: Task disappears, count updates

#### 📋 Copy Button
- [ ] **Icon**: Clipboard
- [ ] **Bounce Animation**: Visible bounce effect
- [ ] **Delay**: Starts 50ms after Complete button
- [ ] **Tap**: Copies task to clipboard
- [ ] **Alert**: Shows "✓ Copied to clipboard!"
- [ ] **Paste Test**: Can paste in Notes/Messages app

#### 📤 Share Button
- [ ] **Icon**: Share arrow
- [ ] **Bounce Animation**: Visible bounce effect
- [ ] **Delay**: Starts 100ms after Complete button
- [ ] **Tap**: Opens share dialog
- [ ] **Format**: Task details with priority/status/date
- [ ] **Share Works**: Can share to any app

#### Animation Timing
- [ ] **Staggered**: Each task's buttons animate with 100ms delay
- [ ] **Loop**: Animation repeats continuously
- [ ] **Smooth**: No jerky movements
- [ ] **Fast**: Faster than Notes page animations

### 7. Saved Memos Behavior
- [ ] **Before Save**: Memo visible on home page (if it's an action item)
- [ ] **Tap Save 🔖**: Saves memo
- [ ] **After Save**: Memo REMOVED from home page
- [ ] **Check Notes**: Saved memo still in Notes tab
- [ ] **Re-open Home**: Saved memo doesn't reappear

### 8. Quick Actions Section
- [ ] **Layout**: 3 buttons in a row
- [ ] **Icons**: 🎙️ Record, 💬 Let's plan, 📝 Notes
- [ ] **Labels**: Correct text under each icon
- [ ] **"Let's plan"**: Not "Chat" (renamed)
- [ ] **Animations**:
  - [ ] All 3 icons bounce
  - [ ] Record: 0ms delay
  - [ ] Let's plan: 100ms delay
  - [ ] Notes: 200ms delay
- [ ] **Tap Record**: Navigates to recording tab
- [ ] **Tap Let's plan**: Navigates to chat tab
- [ ] **Tap Notes**: Navigates to notes tab

---

## 🐛 Edge Cases

### Empty States
- [ ] **No tasks at all**: All sections show empty states
- [ ] **Only completed tasks**: Progress shows 100%, no pending tasks
- [ ] **No tasks today**: Today's Tasks card shows empty state
- [ ] **All tasks past due**: Still appear in priority list

### Data Refresh
- [ ] **Pull to Refresh**: Works correctly
- [ ] **After Complete**: Data reloads, counts update
- [ ] **After Save**: Memos removed from display
- [ ] **Navigate Away/Back**: State persists or reloads

### Performance
- [ ] **Large Task List**: (20+ tasks) - no lag
- [ ] **Rapid Taps**: Complete button doesn't fire twice
- [ ] **Fast Swipes**: Carousel handles quick gestures
- [ ] **Animation**: Doesn't slow down UI

### Visual
- [ ] **No Overlaps**: Text doesn't overlap badges/buttons
- [ ] **Truncation**: Long titles show "..." 
- [ ] **Colors**: All badges show correct colors
- [ ] **Spacing**: Even padding throughout

---

## 📱 Device-Specific Tests

### iOS
- [ ] Native share dialog works
- [ ] Haptic feedback (if implemented)
- [ ] Safe area respected (notch devices)
- [ ] Animations smooth (60 FPS)

### Android
- [ ] Native share dialog works
- [ ] Back button navigation
- [ ] Status bar color correct
- [ ] Animations smooth (60 FPS)

---

## 🔄 Integration Tests

### With AgentService
- [ ] `getPendingActions()`: Returns all pending tasks
- [ ] `completeAction()`: Marks task complete successfully
- [ ] `getCompletionStats()`: Returns correct stats
- [ ] Priority field: high/medium/low values recognized

### With Clipboard
- [ ] `Clipboard.setString()`: Copies text correctly
- [ ] Clipboard content: Matches expected format
- [ ] Works on both iOS and Android

### With Share API
- [ ] `Share.share()`: Opens dialog correctly
- [ ] Message format: Matches specification
- [ ] Title: Shows correct title
- [ ] Works on both iOS and Android

---

## 🎨 Visual Regression

Compare with screenshots:
- [ ] **Carousel Cards**: Match expected design
- [ ] **Priority Badges**: Colors match specification
- [ ] **Spacing**: Consistent padding
- [ ] **Fonts**: Correct sizes and weights
- [ ] **Icons**: Proper emoji rendering
- [ ] **Shadows**: Cards have subtle shadows

---

## ✅ Acceptance Criteria

All 7 requirements must pass:

1. [ ] **Removed Sections**: "Today's Tasks" and "This Week" gone
2. [ ] **Priority List**: Shows ALL tasks, sorted by date→priority
3. [ ] **Carousel**: Swipeable, 2 cards, with indicators
4. [ ] **Complete Button**: Works, animates, shows alert
5. [ ] **Saved Memos**: Removed from home, stay in Notes
6. [ ] **Share Options**: Individual, Copy, Bulk all work
7. [ ] **Animations**: Bouncing icons on all buttons
8. [ ] **"Let's plan"**: Label updated (not "Chat")

---

## 🚦 Test Results

| Test Category | Pass | Fail | Notes |
|--------------|------|------|-------|
| Carousel | ☐ | ☐ | |
| Progress Card | ☐ | ☐ | |
| Today's Tasks | ☐ | ☐ | |
| Bulk Share | ☐ | ☐ | |
| Priority List | ☐ | ☐ | |
| Complete Button | ☐ | ☐ | |
| Copy Button | ☐ | ☐ | |
| Share Button | ☐ | ☐ | |
| Animations | ☐ | ☐ | |
| Saved Memos | ☐ | ☐ | |
| Quick Actions | ☐ | ☐ | |
| Empty States | ☐ | ☐ | |
| Performance | ☐ | ☐ | |

---

## 🐞 Bug Report Template

```markdown
**Bug**: [Brief description]
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Device**: iOS/Android
**Screenshot**: [If applicable]
**Priority**: High/Medium/Low
```

---

## 📝 Testing Notes

**Tester**: _______________  
**Date**: _______________  
**Device**: _______________  
**OS Version**: _______________  

**Overall Status**: ☐ Pass ☐ Fail ☐ Needs Fixes

**Comments**:
```




```

---

## 🎯 Next After Testing

Once all tests pass:
- [ ] Document any bugs found
- [ ] Fix critical issues
- [ ] Proceed to "Let's plan" AI agent implementation
- [ ] Prepare for production deployment

---

**Test Version**: V2.0  
**Last Updated**: December 11, 2025
