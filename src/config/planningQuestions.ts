/**
 * Planning Questions Configuration
 * Smart questions Jeetu asks for each planning category
 */

export type QuestionType = 'number' | 'chips' | 'slider' | 'text' | 'date';

export interface PlanningQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  min?: number;
  max?: number;
  unit?: string;
  placeholder?: string;
}

export interface CategoryQuestions {
  category: string;
  icon: string;
  color: string;
  welcomeMessage: string;
  questions: PlanningQuestion[];
}

// Health Planning Questions
export const HEALTH_QUESTIONS: CategoryQuestions = {
  category: 'Health',
  icon: '🏥',
  color: '#10B981',
  welcomeMessage: "Let's create a personalized health plan for you! I'll ask a few questions to understand your goals better.",
  questions: [
    {
      id: 'age',
      question: "What's your age?",
      type: 'number',
      min: 10,
      max: 100,
      unit: 'years',
    },
    {
      id: 'weight',
      question: "What's your current weight?",
      type: 'number',
      min: 30,
      max: 200,
      unit: 'kg',
    },
    {
      id: 'goal',
      question: "What's your primary health goal?",
      type: 'chips',
      options: ['Lose Weight', 'Build Muscle', 'Stay Fit', 'Better Sleep', 'Reduce Stress'],
    },
    {
      id: 'activity',
      question: "How active are you currently?",
      type: 'chips',
      options: ['Sedentary', 'Light Activity', 'Moderate', 'Very Active'],
    },
    {
      id: 'focus',
      question: "What areas do you want to focus on?",
      type: 'chips',
      options: ['Exercise', 'Diet', 'Sleep', 'Mental Health', 'Hydration'],
    },
  ],
};

// Travel Planning Questions
export const TRAVEL_QUESTIONS: CategoryQuestions = {
  category: 'Travel',
  icon: '✈️',
  color: '#3B82F6',
  welcomeMessage: "Exciting! Let's plan your perfect trip. Tell me more about your travel plans.",
  questions: [
    {
      id: 'destination',
      question: "Where are you planning to go?",
      type: 'text',
      placeholder: 'e.g., Goa, Paris, Bali...',
    },
    {
      id: 'duration',
      question: "How many days is your trip?",
      type: 'number',
      min: 1,
      max: 30,
      unit: 'days',
    },
    {
      id: 'budget',
      question: "What's your budget range?",
      type: 'chips',
      options: ['Budget', 'Mid-Range', 'Luxury', 'No Limit'],
    },
    {
      id: 'travelers',
      question: "Who's traveling with you?",
      type: 'chips',
      options: ['Solo', 'Partner', 'Family', 'Friends', 'Work'],
    },
    {
      id: 'interests',
      question: "What interests you most?",
      type: 'chips',
      options: ['Adventure', 'Culture', 'Food', 'Relaxation', 'Shopping'],
    },
  ],
};

// Work Planning Questions
export const WORK_QUESTIONS: CategoryQuestions = {
  category: 'Work',
  icon: '💼',
  color: '#8B5CF6',
  welcomeMessage: "Let's boost your productivity! Tell me about your work goals.",
  questions: [
    {
      id: 'project',
      question: "What project or goal are you working on?",
      type: 'text',
      placeholder: 'e.g., Launch website, Complete report...',
    },
    {
      id: 'deadline',
      question: "When is your deadline?",
      type: 'chips',
      options: ['Today', 'This Week', 'This Month', 'No Deadline'],
    },
    {
      id: 'priority',
      question: "What's the priority level?",
      type: 'chips',
      options: ['Low', 'Medium', 'High', 'Critical'],
    },
    {
      id: 'blockers',
      question: "What's your main challenge?",
      type: 'chips',
      options: ['Time', 'Focus', 'Resources', 'Clarity', 'Motivation'],
    },
  ],
};

// Entertainment Planning Questions
export const ENTERTAINMENT_QUESTIONS: CategoryQuestions = {
  category: 'Entertainment',
  icon: '🎬',
  color: '#F59E0B',
  welcomeMessage: "Planning some fun time! Let me help you organize your entertainment.",
  questions: [
    {
      id: 'type',
      question: "What kind of entertainment?",
      type: 'chips',
      options: ['Movies', 'Music', 'Games', 'Events', 'Sports'],
    },
    {
      id: 'when',
      question: "When are you planning this?",
      type: 'chips',
      options: ['Today', 'This Weekend', 'Next Week', 'Flexible'],
    },
    {
      id: 'group',
      question: "Who's joining?",
      type: 'chips',
      options: ['Just Me', 'Partner', 'Friends', 'Family'],
    },
    {
      id: 'budget',
      question: "Budget for this?",
      type: 'chips',
      options: ['Free', 'Under ₹500', 'Under ₹2000', 'Any'],
    },
  ],
};

// Personal Planning Questions
export const PERSONAL_QUESTIONS: CategoryQuestions = {
  category: 'Personal',
  icon: '🌟',
  color: '#EC4899',
  welcomeMessage: "Let's work on personal growth! What would you like to improve?",
  questions: [
    {
      id: 'area',
      question: "What area of life do you want to improve?",
      type: 'chips',
      options: ['Habits', 'Relationships', 'Learning', 'Finance', 'Mindfulness'],
    },
    {
      id: 'time',
      question: "How much time can you dedicate daily?",
      type: 'chips',
      options: ['10 min', '30 min', '1 hour', '2+ hours'],
    },
    {
      id: 'motivation',
      question: "What motivates you most?",
      type: 'chips',
      options: ['Progress', 'Recognition', 'Peace', 'Achievement', 'Connection'],
    },
  ],
};

// IDEAS Planning Questions - For brainstorming and capturing ideas
export const IDEAS_QUESTIONS: CategoryQuestions = {
  category: 'Ideas',
  icon: '💡',
  color: '#F59E0B',
  welcomeMessage: "Great! Let's capture and develop your ideas. What's on your mind?",
  questions: [
    {
      id: 'ideaType',
      question: "What kind of idea is this?",
      type: 'chips',
      options: ['Business', 'Creative', 'Project', 'Solution', 'Improvement', 'Random Thought'],
    },
    {
      id: 'idea',
      question: "Describe your idea in a few words",
      type: 'text',
      placeholder: 'e.g., App for pet lovers, New recipe, Room makeover...',
    },
    {
      id: 'priority',
      question: "How urgent is this idea?",
      type: 'chips',
      options: ['Explore Someday', 'This Month', 'This Week', 'Right Now'],
    },
    {
      id: 'resources',
      question: "What do you need to make this happen?",
      type: 'chips',
      options: ['Time', 'Money', 'Skills', 'People', 'Research', 'Just Start'],
    },
    {
      id: 'nextStep',
      question: "What's the first step you can take?",
      type: 'text',
      placeholder: 'e.g., Research competitors, Sketch design, Talk to friend...',
    },
  ],
};

// DAILY Planning Questions - For daily routines and task management
export const DAILY_QUESTIONS: CategoryQuestions = {
  category: 'Daily',
  icon: '📅',
  color: '#6366F1',
  welcomeMessage: "Let's plan your day! I'll help you organize and prioritize.",
  questions: [
    {
      id: 'feeling',
      question: "How are you feeling today?",
      type: 'chips',
      options: ['Energetic 🔥', 'Good 😊', 'Okay 😐', 'Tired 😴', 'Stressed 😰'],
    },
    {
      id: 'mainGoal',
      question: "What's your main goal for today?",
      type: 'text',
      placeholder: 'e.g., Finish presentation, Clean house, Learn something new...',
    },
    {
      id: 'timeAvailable',
      question: "How much productive time do you have today?",
      type: 'chips',
      options: ['< 2 hours', '2-4 hours', '4-6 hours', 'Full day'],
    },
    {
      id: 'mustDo',
      question: "What MUST be done today?",
      type: 'text',
      placeholder: 'e.g., Pay bills, Submit report, Doctor appointment...',
    },
    {
      id: 'selfCare',
      question: "What self-care will you include?",
      type: 'chips',
      options: ['Exercise', 'Meditation', 'Hobby Time', 'Social', 'Rest', 'Skip Today'],
    },
  ],
};

// CHORES Planning Questions - For daily household tasks
export const CHORES_QUESTIONS: CategoryQuestions = {
  category: 'Chores',
  icon: '🏠',
  color: '#14B8A6',
  welcomeMessage: "Let's organize your household tasks! What needs to get done?",
  questions: [
    {
      id: 'choreType',
      question: "What type of chores do you need to plan?",
      type: 'chips',
      options: ['Shopping', 'Appointments', 'Household', 'Errands', 'Payments', 'Mixed'],
    },
    {
      id: 'shopping',
      question: "Do you need to buy anything? (Select all)",
      type: 'chips',
      options: ['Groceries', 'Vegetables', 'Medicines', 'Household Items', 'Kids Supplies', 'None'],
    },
    {
      id: 'appointments',
      question: "Any appointments to schedule?",
      type: 'chips',
      options: ['Doctor', 'Dentist', 'School Meeting', 'Bank', 'Government', 'None'],
    },
    {
      id: 'household',
      question: "What household tasks need attention?",
      type: 'chips',
      options: ['Cleaning', 'Laundry', 'Cooking', 'Repairs', 'Gardening', 'None'],
    },
    {
      id: 'urgency',
      question: "When do these need to be done?",
      type: 'chips',
      options: ['Today', 'Tomorrow', 'This Week', 'This Month'],
    },
  ],
};

// Get questions by category
export const getCategoryQuestions = (category: string): CategoryQuestions | null => {
  const categoryLower = category.toLowerCase();
  
  switch (categoryLower) {
    case 'health':
      return HEALTH_QUESTIONS;
    case 'travel':
      return TRAVEL_QUESTIONS;
    case 'work':
      return WORK_QUESTIONS;
    case 'entertainment':
      return ENTERTAINMENT_QUESTIONS;
    case 'personal':
      return PERSONAL_QUESTIONS;
    case 'ideas':
      return IDEAS_QUESTIONS;
    case 'daily':
      return DAILY_QUESTIONS;
    case 'chores':
      return CHORES_QUESTIONS;
    default:
      return null;
  }
};

// Default tasks based on answers (Health example)
export const getHealthTasks = (answers: Record<string, any>) => {
  const tasks: { title: string; category: string; icon: string }[] = [];
  
  // Base tasks everyone gets
  tasks.push(
    { title: 'Drink 8 glasses of water', category: 'health', icon: '💧' },
    { title: 'Take vitamins', category: 'health', icon: '💊' },
  );
  
  // Goal-based tasks
  if (answers.goal === 'Lose Weight') {
    tasks.push(
      { title: '30 min cardio workout', category: 'health', icon: '🏃' },
      { title: 'Track calories', category: 'health', icon: '📊' },
    );
  } else if (answers.goal === 'Build Muscle') {
    tasks.push(
      { title: 'Weight training session', category: 'health', icon: '🏋️' },
      { title: 'High protein meal', category: 'health', icon: '🥩' },
    );
  } else if (answers.goal === 'Better Sleep') {
    tasks.push(
      { title: 'No screens 1hr before bed', category: 'health', icon: '📵' },
      { title: 'Relaxation routine', category: 'health', icon: '🧘' },
    );
  }
  
  // Focus area tasks
  if (answers.focus?.includes('Exercise')) {
    tasks.push({ title: 'Morning workout', category: 'health', icon: '🌅' });
  }
  if (answers.focus?.includes('Diet')) {
    tasks.push({ title: 'Meal prep for tomorrow', category: 'health', icon: '🥗' });
  }
  if (answers.focus?.includes('Mental Health')) {
    tasks.push({ title: '10 min meditation', category: 'health', icon: '🧘' });
  }
  
  return tasks;
};

// IDEAS task generator
export const getIdeasTasks = (answers: Record<string, any>) => {
  const tasks: { title: string; category: string; icon: string }[] = [];
  
  // Always add idea capture task
  if (answers.idea) {
    tasks.push({ title: `📝 Document: ${answers.idea}`, category: 'ideas', icon: '💡' });
  }
  
  // Type-based tasks
  if (answers.ideaType === 'Business') {
    tasks.push(
      { title: 'Research market & competitors', category: 'ideas', icon: '🔍' },
      { title: 'Create simple business plan', category: 'ideas', icon: '📋' },
      { title: 'Identify target audience', category: 'ideas', icon: '🎯' },
    );
  } else if (answers.ideaType === 'Creative') {
    tasks.push(
      { title: 'Gather inspiration & references', category: 'ideas', icon: '🎨' },
      { title: 'Create mood board or sketches', category: 'ideas', icon: '📐' },
    );
  } else if (answers.ideaType === 'Project') {
    tasks.push(
      { title: 'Define project scope & goals', category: 'ideas', icon: '🎯' },
      { title: 'Break into smaller tasks', category: 'ideas', icon: '📋' },
      { title: 'Set timeline & milestones', category: 'ideas', icon: '📅' },
    );
  } else if (answers.ideaType === 'Solution') {
    tasks.push(
      { title: 'Define the problem clearly', category: 'ideas', icon: '🔎' },
      { title: 'Brainstorm alternate solutions', category: 'ideas', icon: '🧠' },
    );
  }
  
  // First step task
  if (answers.nextStep) {
    tasks.push({ title: `First step: ${answers.nextStep}`, category: 'ideas', icon: '🚀' });
  }
  
  // Resource-based tasks
  if (answers.resources?.includes('Research')) {
    tasks.push({ title: 'Spend 30 min researching', category: 'ideas', icon: '📚' });
  }
  if (answers.resources?.includes('People')) {
    tasks.push({ title: 'Reach out to potential collaborators', category: 'ideas', icon: '🤝' });
  }
  
  return tasks;
};

// DAILY task generator
export const getDailyTasks = (answers: Record<string, any>) => {
  const tasks: { title: string; category: string; icon: string }[] = [];
  
  // Main goal as task
  if (answers.mainGoal) {
    tasks.push({ title: `🎯 ${answers.mainGoal}`, category: 'daily', icon: '⭐' });
  }
  
  // Must-do as task
  if (answers.mustDo) {
    tasks.push({ title: `⚡ ${answers.mustDo}`, category: 'daily', icon: '🔴' });
  }
  
  // Self-care tasks
  if (answers.selfCare && answers.selfCare !== 'Skip Today') {
    const selfCareIcons: Record<string, string> = {
      'Exercise': '🏃',
      'Meditation': '🧘',
      'Hobby Time': '🎨',
      'Social': '👥',
      'Rest': '😴',
    };
    tasks.push({ 
      title: `Self-care: ${answers.selfCare}`, 
      category: 'daily', 
      icon: selfCareIcons[answers.selfCare] || '💆' 
    });
  }
  
  // Feeling-based suggestions
  if (answers.feeling === 'Tired 😴' || answers.feeling === 'Stressed 😰') {
    tasks.push(
      { title: 'Take short breaks every hour', category: 'daily', icon: '☕' },
      { title: 'Light walk or stretch', category: 'daily', icon: '🚶' },
    );
  } else if (answers.feeling === 'Energetic 🔥') {
    tasks.push({ title: 'Tackle your hardest task first!', category: 'daily', icon: '💪' });
  }
  
  // Time-based productivity tips
  if (answers.timeAvailable === '< 2 hours') {
    tasks.push({ title: 'Focus on top 2 priorities only', category: 'daily', icon: '📌' });
  } else if (answers.timeAvailable === 'Full day') {
    tasks.push({ title: 'Schedule breaks between deep work', category: 'daily', icon: '⏰' });
  }
  
  // Always add reflection
  tasks.push({ title: 'End-of-day reflection', category: 'daily', icon: '📔' });
  
  return tasks;
};

// CHORES task generator
export const getChoresTasks = (answers: Record<string, any>) => {
  const tasks: { title: string; category: string; icon: string }[] = [];
  
  // Shopping tasks
  if (answers.shopping && !answers.shopping.includes('None')) {
    if (answers.shopping.includes('Groceries')) {
      tasks.push({ title: 'Buy groceries', category: 'chores', icon: '🛒' });
    }
    if (answers.shopping.includes('Vegetables')) {
      tasks.push({ title: 'Buy fresh vegetables', category: 'chores', icon: '🥬' });
    }
    if (answers.shopping.includes('Medicines')) {
      tasks.push({ title: 'Get medicines from pharmacy', category: 'chores', icon: '💊' });
    }
    if (answers.shopping.includes('Household Items')) {
      tasks.push({ title: 'Buy household supplies', category: 'chores', icon: '🧴' });
    }
    if (answers.shopping.includes('Kids Supplies')) {
      tasks.push({ title: 'Get kids supplies', category: 'chores', icon: '🎒' });
    }
  }
  
  // Appointment tasks
  if (answers.appointments && !answers.appointments.includes('None')) {
    if (answers.appointments.includes('Doctor')) {
      tasks.push({ title: 'Schedule doctor appointment', category: 'chores', icon: '🏥' });
    }
    if (answers.appointments.includes('Dentist')) {
      tasks.push({ title: 'Book dentist appointment', category: 'chores', icon: '🦷' });
    }
    if (answers.appointments.includes('School Meeting')) {
      tasks.push({ title: 'Parent-teacher meeting', category: 'chores', icon: '🏫' });
    }
    if (answers.appointments.includes('Bank')) {
      tasks.push({ title: 'Visit bank', category: 'chores', icon: '🏦' });
    }
    if (answers.appointments.includes('Government')) {
      tasks.push({ title: 'Government office work', category: 'chores', icon: '🏛️' });
    }
  }
  
  // Household tasks
  if (answers.household && !answers.household.includes('None')) {
    if (answers.household.includes('Cleaning')) {
      tasks.push({ title: 'House cleaning', category: 'chores', icon: '🧹' });
    }
    if (answers.household.includes('Laundry')) {
      tasks.push({ title: 'Do laundry', category: 'chores', icon: '🧺' });
    }
    if (answers.household.includes('Cooking')) {
      tasks.push({ title: 'Meal prep / Cooking', category: 'chores', icon: '🍳' });
    }
    if (answers.household.includes('Repairs')) {
      tasks.push({ title: 'Home repairs', category: 'chores', icon: '🔧' });
    }
    if (answers.household.includes('Gardening')) {
      tasks.push({ title: 'Garden work', category: 'chores', icon: '🌱' });
    }
  }
  
  // Urgency-based reminders
  if (answers.urgency === 'Today') {
    tasks.push({ title: '⚠️ Complete all tasks TODAY', category: 'chores', icon: '⏰' });
  }
  
  // If no tasks were added, add a general one
  if (tasks.length === 0) {
    tasks.push(
      { title: 'Organize weekly chores list', category: 'chores', icon: '📝' },
      { title: 'Check household supplies', category: 'chores', icon: '📋' },
    );
  }
  
  return tasks;
};
