// src/services/AIService.ts

import { VoiceMemo, MemoCategory, MemoType, AIAnalysis, AIServiceConfig } from '../types';
import StorageService from './StorageService';
import { AI_MODELS } from '../constants';
import Groq from 'groq-sdk';
import LanguageService from './LanguageService';
import { logger } from './Logger';
import ReminderService from './ReminderService';

import { GROQ_API_KEY } from '../config/env';

interface TranscriptionResult {
  transcription: string;
  category: MemoCategory;
  type: MemoType;
  title?: string;
  analysis: AIAnalysis;
  metadata?: any;
}

export interface AnalysisContext {
  members?: { id: string; name: string }[];
}

class AIService {
  private config: AIServiceConfig = {
    provider: 'groq',
    apiKey: GROQ_API_KEY,
  };
  private groqClient: Groq | null = null;

  constructor() {
    this.initialize();
  }

  async initialize(): Promise<void> {
    const savedConfig = await StorageService.getAIConfig();
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }
    
    // Explicitly check env if not in config
    if (!this.config.apiKey) {
        this.config.apiKey = GROQ_API_KEY;
    }

    this.initializeClient();
  }

  private initializeClient() {
    if (this.config.apiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true, // Required for browser/React Native
        });
        logger.info('AIService: Groq client initialized successfully');
      } catch (error) {
        logger.error('AIService: Error initializing Groq client:', error);
        this.groqClient = null;
      }
    } else {
      logger.warn('AIService: No Groq API key provided');
    }
  }

  async setConfig(config: AIServiceConfig): Promise<void> {
    this.config = config;
    await StorageService.saveAIConfig(config);
    this.initializeClient();
  }

  async transcribeAndAnalyze(audioUri: string, context?: AnalysisContext): Promise<TranscriptionResult> {
    try {
      logger.info('Starting transcription and analysis', { audioUri });
      
      // Get transcription using Groq Whisper
      const transcription = await this.transcribeAudio(audioUri);
      
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('No speech detected in the recording. Please try again and speak clearly.');
      }
      
      // Analyze with Groq
      const analysis = await this.analyzeMemo(transcription, context);
      logger.info('Analysis completed successfully');
      
      // 5. If actionable, schedule a smart reminder
      if (analysis.analysis?.actionItems && analysis.analysis.actionItems.length > 0) {
        // Schedule a reminder for 4 hours later (Simulated as 10s for demo)
        await ReminderService.scheduleSmartReminder(
          `Action Required: ${analysis.title || 'Voice Memo'}`,
          `You have ${analysis.analysis.actionItems.length} pending action items. Let's get them done!`,
          10/3600 // 10 seconds
        );
      }

      return analysis;
    } catch (error: any) {
      logger.error('Error in transcription and analysis:', error);
      throw error;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    // Use Groq Whisper API to transcribe the actual audio
    if (!this.groqClient) {
      logger.error('Groq client not initialized - API key missing!');
      throw new Error('AI service is not configured. Please check your API key in settings or environment variables.');
    }

    try {
      logger.info('Transcribing audio using Groq Whisper API...');
      
      // For React Native, we need to use FormData and native fetch
      // Groq SDK's File handling doesn't work properly in RN
      const formData = new FormData();
      
      // Add the audio file to FormData
      if (audioUri.startsWith('file://')) {
        formData.append('file', {
          uri: audioUri,
          type: 'audio/mp4',
          name: 'audio.m4a',
        } as any);
      } else if (audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        
        // Create a File object from the blob for better compatibility
        const file = new File([blob], 'audio.m4a', { type: blob.type || 'audio/mp4' });
        formData.append('file', file as any);
      } else if (audioUri.startsWith('data:audio/')) {
        const base64Data = audioUri.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        // Create a blob-like object for FormData
        formData.append('file', {
          uri: `data:audio/mp4;base64,${base64Data}`,
          type: 'audio/mp4',
          name: 'audio.m4a',
        } as any);
      } else {
        throw new Error('Unsupported audio URI format');
      }
      
      // Get user's preferred language for transcription
      const userLanguage = LanguageService.getCurrentLanguage();
      const languageCode = userLanguage === 'en' ? 'en' : userLanguage;
      
      // Add other required parameters
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', languageCode);
      formData.append('response_format', 'text');
      
      // Use native fetch instead of Groq SDK for better React Native compatibility
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Groq API error response:', { errorText });
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const transcribedText = await response.text();
      logger.debug('Transcription result received', { length: transcribedText.length });
      return transcribedText;
    } catch (error: any) {
      logger.error('Error transcribing audio with Groq:', error);
      
      // Provide more helpful error messages
      if (error.message?.includes('internet connection')) {
        throw new Error('No internet connection. Please check your network and try again.');
      } else if (error.message?.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.');
      } else if (error.message?.includes('empty')) {
        throw new Error('Recording is empty. Please try recording again.');
      } else if (error.status === 401) {
        throw new Error('API authentication failed. Please contact support.');
      } else {
        throw new Error(`Transcription failed: ${error.message || 'Unknown error'}. Please try again or check your internet connection.`);
      }
    }
  }

  async analyzeMemo(transcription: string, context?: AnalysisContext): Promise<TranscriptionResult> {
    logger.info('Analyzing transcription', { provider: this.config.provider });
    
    if (this.groqClient && this.config.provider === 'groq') {
      try {
        return await this.callGroqAPI(transcription, context);
      } catch (error) {
        logger.error('Groq API error, falling back to mock:', error);
        return this.mockTranscribeAndAnalyze();
      }
    }
    
    logger.info('Using mock analysis');
    return this.mockTranscribeAndAnalyze();
  }

  async analyzeImage(imageUri: string, prompt: string = 'Describe this image'): Promise<string> {
    logger.info('Analyzing image', { provider: this.config.provider });

    if (this.groqClient && this.config.provider === 'groq') {
      try {
        const response = await this.groqClient.chat.completions.create({
          model: AI_MODELS.groq.vision,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUri } },
              ],
            },
          ],
        });
        return response.choices[0]?.message?.content || 'No description available.';
      } catch (error) {
        logger.error('Groq Vision API error:', error);
        return 'Failed to analyze image.';
      }
    }
    
    return 'Image analysis not available for this provider.';
  }

  private async callGroqAPI(transcription: string, context?: AnalysisContext): Promise<TranscriptionResult> {
    try {
      const prompt = this.buildAnalysisPrompt(transcription, context);
      
      logger.debug('Calling Groq API for analysis', { model: 'llama-3.3-70b-versatile' });
      
      const message = await this.groqClient!.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        temperature: 0.3,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const responseText = message.choices[0].message.content || '';
      
      if (!responseText) {
        logger.warn('Empty response from Groq API');
        return this.mockTranscribeAndAnalyze();
      }
      
      // Parse the JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const rawCategory = parsed.category || 'Notes';
          // Ensure Title Case for category
          const category = (rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase()) as MemoCategory;
          
          const rawType = parsed.type || 'note';
          // Ensure lowercase for type
          const type = rawType.toLowerCase() as MemoType;

          return {
            transcription,
            category,
            type,
            title: parsed.title || 'Untitled',
            analysis: parsed.analysis || {
              sentiment: 'neutral',
              keywords: [],
              summary: transcription.substring(0, 100),
              actionItems: [],
              suggestedFollowUps: [],
              tone: parsed.analysis?.tone,
              assignments: (parsed.analysis?.assignments || []).map((assignment: any) => {
                // Try to match name to ID if context is provided
                if (context?.members && assignment.assignedToName) {
                   const match = context.members.find(m => 
                     m.name.toLowerCase() === assignment.assignedToName.toLowerCase() || 
                     m.name.toLowerCase().includes(assignment.assignedToName.toLowerCase()) ||
                     assignment.assignedToName.toLowerCase().includes(m.name.toLowerCase())
                   );
                   if (match) {
                     return { ...assignment, assignedToId: match.id };
                   }
                }
                return assignment;
              }),
            },
            metadata: parsed.metadata || {},
          };
        } else {
          logger.warn('Could not extract JSON from analysis response');
          return this.mockTranscribeAndAnalyze();
        }
      } catch (parseError) {
        logger.error('Error parsing Groq response:', parseError, { response: responseText });
        return this.mockTranscribeAndAnalyze();
      }
    } catch (error) {
      logger.error('Error calling Groq API:', error);
      return this.mockTranscribeAndAnalyze();
    }
  }

  private buildAnalysisPrompt(transcription: string, context?: AnalysisContext): string {
    let contextStr = '';
    if (context?.members && context.members.length > 0) {
      contextStr = `\nContext Members (for task assignment): ${JSON.stringify(context.members.map(m => ({ name: m.name, id: m.id })))}`;
    }

    return `Extract information from this voice memo transcription.${contextStr}
    
DO NOT invent, infer, or guess details not explicitly mentioned.
DO NOT invent, infer, or guess details not explicitly mentioned.
DO NOT add people, team names, dates, times, or other details the user did not mention.
Extract ONLY what is directly said.

Return ONLY valid JSON matching this exact structure:
{
  "category": "Personal|Work|Ideas|Shopping|Health|Learning|Travel|Finance|Hobbies|Notes",
  "type": "event|reminder|note",
  "title": "first 3-5 words of the memo or explicit subject mentioned",
  "analysis": {
    "sentiment": "positive|neutral|negative",
    "keywords": ["only words explicitly mentioned in transcription"],
    "summary": "1-2 sentence direct quote or paraphrase of what was said - NO invented details",
    "actionItems": ["only actions the user explicitly stated or clearly implied"],
    "actionItems": ["only actions the user explicitly stated or clearly implied"],
    "assignments": [
      {
        "task": "Specific task description",
        "assignedToName": "Name of the person assigned (must match a name in Context Members if provided)",
        "priority": "low|medium|high"
      }
    ],
    "suggestedFollowUps": [],
    "tone": "casual|formal|urgent|enthusiastic|serious|humorous"
  },
  "metadata": {
    "priority": "low|medium|high",
    "eventDate": "ISO date string ONLY if user mentioned a specific date",
    "eventTime": "HH:MM ONLY if user mentioned a specific time"
  }
}

Category Selection Rules (choose based on explicit keywords):
- Shopping: if mentions "buy", "get", "purchase", "need to pick up", etc.
- Health: if mentions "doctor", "dentist", "appointment", "checkup", "hospital", etc.
- Work: if mentions "meeting", "project", "work", "task", "deadline", etc. (but NO invented team/people names)
- Finance: if mentions "bill", "pay", "money", "budget", "cost", etc.
- Travel: if mentions "trip", "travel", "going to", "flight", "hotel", etc.
- Learning: if mentions "study", "learn", "course", "class", "research", etc.
- Ideas: if mentions opinions, proposals, or thoughts without specific action items
- Event: if has specific date/time mentioned
- Reminder: if mentions "should", "need to", "have to", "remember", etc.
- Personal: default category
- Notes: for general observations without action items

Transcription: "${transcription}"

CRITICAL: Return ONLY valid JSON, no additional text. NO invented details.`;
  }

  private mockTranscribeAndAnalyze(): TranscriptionResult {
    const mockScenarios: TranscriptionResult[] = [
      {
        transcription: "Call dentist tomorrow at 4pm to schedule a checkup",
        category: "Health",
        type: "event",
        title: "Dentist Appointment",
        analysis: {
          sentiment: "neutral",
          keywords: ["dentist", "appointment", "checkup", "tomorrow"],
          summary: "Schedule a dental checkup appointment for tomorrow at 4pm",
          actionItems: ["Call dentist", "Schedule appointment"],
          suggestedFollowUps: ["Set a reminder for the appointment", "Check insurance coverage"],
          tone: "neutral"
        },
        metadata: {
          eventDate: new Date(Date.now() + 86400000).toISOString(),
          eventTime: "16:00",
          priority: "medium"
        }
      },
      {
        transcription: "Buy milk, eggs, bread, and coffee on the way home",
        category: "Shopping",
        type: "reminder",
        title: "Grocery Shopping",
        analysis: {
          sentiment: "neutral",
          keywords: ["buy", "groceries", "milk", "eggs"],
          summary: "Pick up essential groceries including milk, eggs, bread, and coffee",
          actionItems: ["Buy milk", "Buy eggs", "Buy bread", "Buy coffee"],
          suggestedFollowUps: ["Check if anything else is needed", "Look for coupons"],
          tone: "casual"
        },
        metadata: {
          reminderDate: new Date().toISOString(),
          priority: "medium"
        }
      },
      {
        transcription: "I think we should redesign the homepage to be more user-friendly and modern",
        category: "Ideas",
        type: "note",
        title: "Homepage Redesign Idea",
        analysis: {
          sentiment: "positive",
          keywords: ["redesign", "homepage", "user-friendly", "modern"],
          summary: "Proposal to update the homepage with a more modern and user-friendly design",
          actionItems: ["Research modern design trends", "Create mockups"],
          suggestedFollowUps: ["Schedule meeting with design team", "Review competitor sites"],
          tone: "enthusiastic"
        },
        metadata: {
          priority: "low"
        }
      }
    ];

    return mockScenarios[Math.floor(Math.random() * mockScenarios.length)];
  }

  async generatePersonaInsights(memos: VoiceMemo[]): Promise<any> {
    // Analyze user's memos to build persona
    const categories = memos.reduce((acc, memo) => {
      acc[memo.category] = (acc[memo.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const keywords = memos
      .flatMap(memo => memo.aiAnalysis?.keywords || [])
      .reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const topKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return {
      categoryPreferences: categories,
      topKeywords,
      totalMemos: memos.length,
      insights: this.generateInsightsText(categories, topKeywords),
    };
  }

  private generateInsightsText(categories: Record<string, number>, keywords: Array<{ word: string; count: number }>): string[] {
    const insights: string[] = [];
    
    const topCategory = Object.entries(categories).sort(([, a], [, b]) => b - a)[0];
    if (topCategory) {
      insights.push(`You focus most on ${topCategory[0]} with ${topCategory[1]} memos`);
    }

    if (keywords.length > 0) {
      insights.push(`Your top interests include: ${keywords.slice(0, 3).map(k => k.word).join(', ')}`);
    }

    return insights;
  }

  async generateDeepPersona(memos: VoiceMemo[]): Promise<any> {
    logger.info('Generating Deep AI Persona', { count: memos.length });
    
    if (!this.groqClient || this.config.provider !== 'groq') {
       logger.warn('Deep Persona requires Groq');
       return null;
    }

    if (memos.length < 3) {
        return null; // Not enough data
    }

    // Prepare context from last 20 memos
    const recentMemos = memos.slice(0, 20).map(m => 
        `- [${m.category}] ${m.transcription.substring(0, 200)}`
    ).join('\n');

    const prompt = `
    Analyze these voice memos to build a comprehensive User Persona.
    
    Memos:
    ${recentMemos}
    
    Construct a psychological profile of the user based ONLY on this data.
    Infer their goals, habits, and communication style.
    
    Return VALID JSON:
    {
      "bio": "A short narrative description of who this user is (e.g., A busy product manager creating a startup...)",
      "traits": ["trait1", "trait2", "trait3"],
      "goals": ["goal1", "goal2"],
      "communication_style": "formal/casual, descriptive/concise, etc.",
      "interests": ["topic1", "topic2"]
    }
    `;

    try {
        const response = await this.groqClient.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        });
        
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
    } catch (error) {
        logger.error('Error generating deep persona:', error);
        return null;
    }
  }
}

export default new AIService();
