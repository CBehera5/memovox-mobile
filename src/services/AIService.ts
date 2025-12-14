// src/services/AIService.ts

import { VoiceMemo, MemoCategory, MemoType, AIAnalysis, AIServiceConfig } from '../types';
import StorageService from './StorageService';
import { AI_MODELS } from '../constants';
import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '../config/env';

interface TranscriptionResult {
  transcription: string;
  category: MemoCategory;
  type: MemoType;
  title?: string;
  analysis: AIAnalysis;
  metadata?: any;
}

class AIService {
  private config: AIServiceConfig = {
    provider: 'groq',
    apiKey: GROQ_API_KEY,
  };
  private groqClient: Groq | null = null;

  constructor() {
    // Initialize Groq client with the API key from environment
    if (this.config.apiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: this.config.apiKey,
          dangerouslyAllowBrowser: true, // Required for browser/React Native
        });
        console.log('Groq client initialized successfully');
      } catch (error) {
        console.error('Error initializing Groq client:', error);
        this.groqClient = null;
      }
    } else {
      console.warn('No Groq API key provided');
    }
  }

  async initialize(): Promise<void> {
    const savedConfig = await StorageService.getAIConfig();
    if (savedConfig) {
      this.config = savedConfig;
      // Reinitialize Groq client if API key changed
      if (this.config.apiKey) {
        try {
          this.groqClient = new Groq({
            apiKey: this.config.apiKey,
            dangerouslyAllowBrowser: true,
          });
        } catch (error) {
          console.error('Error initializing Groq client:', error);
        }
      }
    }
  }

  async setConfig(config: AIServiceConfig): Promise<void> {
    this.config = config;
    await StorageService.saveAIConfig(config);
    // Reinitialize Groq client
    if (config.apiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: config.apiKey,
          dangerouslyAllowBrowser: true,
        });
      } catch (error) {
        console.error('Error initializing Groq client:', error);
      }
    }
  }

  async transcribeAndAnalyze(audioUri: string): Promise<TranscriptionResult> {
    // For now, use sample transcription and then analyze with Groq
    try {
      console.log('Starting transcription and analysis for:', audioUri);
      
      // Get transcription using Groq Whisper
      const transcription = await this.transcribeAudio(audioUri);
      console.log('Transcription result:', transcription.substring(0, 100));
      
      // Check if transcription actually worked
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('No speech detected in the recording. Please try again and speak clearly.');
      }
      
      // Analyze with Groq
      const analysis = await this.analyzeTranscription(transcription);
      console.log('Analysis completed successfully');
      
      return analysis;
    } catch (error: any) {
      console.error('Error in transcription and analysis:', error);
      // Re-throw the error with the original message so the UI can show it
      throw error;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string> {
    // Use Groq Whisper API to transcribe the actual audio
    if (!this.groqClient) {
      console.warn('Groq client not initialized, cannot transcribe');
      return 'Unable to transcribe audio - Groq client not available';
    }

    try {
      console.log('Transcribing audio using Groq Whisper API...');
      console.log('Audio URI type:', audioUri.substring(0, 50));
      
      // For React Native, we need to use FormData and native fetch
      // Groq SDK's File handling doesn't work properly in RN
      const formData = new FormData();
      
      // Add the audio file to FormData
      if (audioUri.startsWith('file://')) {
        console.log('Processing file:// URI with FormData...');
        formData.append('file', {
          uri: audioUri,
          type: 'audio/mp4',
          name: 'audio.m4a',
        } as any);
      } else if (audioUri.startsWith('http://') || audioUri.startsWith('https://')) {
        console.log('Fetching remote URL and converting to FormData entry...');
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', {
          uri: audioUri,
          type: 'audio/mp4',
          name: 'audio.m4a',
        } as any);
      } else if (audioUri.startsWith('data:audio/')) {
        console.log('Converting data URI to FormData entry...');
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
      
      // Add other required parameters
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'en');
      formData.append('response_format', 'text');

      console.log('Sending request to Groq API...');
      
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
        console.error('Groq API error response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const transcribedText = await response.text();
      console.log('Transcription from Groq Whisper successful:', transcribedText.substring(0, 100));
      return transcribedText;
    } catch (error: any) {
      console.error('Error transcribing audio with Groq:', error);
      
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

  private async analyzeTranscription(transcription: string): Promise<TranscriptionResult> {
    console.log('Analyzing transcription with provider:', this.config.provider);
    
    if (this.groqClient && this.config.provider === 'groq') {
      try {
        return await this.callGroqAPI(transcription);
      } catch (error) {
        console.error('Groq API error, falling back to mock:', error);
        return this.mockTranscribeAndAnalyze();
      }
    }
    
    console.log('Using mock analysis');
    return this.mockTranscribeAndAnalyze();
  }

  private async callGroqAPI(transcription: string): Promise<TranscriptionResult> {
    try {
      const prompt = this.buildAnalysisPrompt(transcription);
      
      console.log('Calling Groq API with model: llama-3.3-70b-versatile');
      
      const message = await this.groqClient!.chat.completions.create({
        model: 'llama-3.3-70b-versatile', // Using Meta Llama 3.3 70B Versatile
        max_tokens: 1024,
        temperature: 0.3, // Lower temperature for more consistent output
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      console.log('Groq API response received');

      // Extract the response content
      const responseText = message.choices[0].message.content || '';
      console.log('Response text:', responseText);
      
      if (!responseText) {
        console.warn('Empty response from Groq API');
        return this.mockTranscribeAndAnalyze();
      }
      
      // Parse the JSON response
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('Parsed analysis:', parsed);
          
          return {
            transcription,
            category: parsed.category || 'Notes',
            type: parsed.type || 'note',
            title: parsed.title || 'Untitled',
            analysis: parsed.analysis || {
              sentiment: 'neutral',
              keywords: [],
              summary: transcription.substring(0, 100),
              actionItems: [],
              suggestedFollowUps: [],
            },
            metadata: parsed.metadata || {},
          };
        } else {
          console.warn('Could not extract JSON from response');
          return this.mockTranscribeAndAnalyze();
        }
      } catch (parseError) {
        console.error('Error parsing Groq response:', parseError, 'Response:', responseText);
        return this.mockTranscribeAndAnalyze();
      }
    } catch (error) {
      console.error('Error calling Groq API:', error);
      return this.mockTranscribeAndAnalyze();
    }
  }

  private buildAnalysisPrompt(transcription: string): string {
    return `Extract information from this voice memo transcription.
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
    "suggestedFollowUps": []
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
          suggestedFollowUps: ["Set a reminder for the appointment", "Check insurance coverage"]
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
          suggestedFollowUps: ["Check if anything else is needed", "Look for coupons"]
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
          suggestedFollowUps: ["Schedule meeting with design team", "Review competitor sites"]
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
}

export default new AIService();
