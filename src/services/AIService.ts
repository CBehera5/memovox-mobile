// src/services/AIService.ts

import { VoiceMemo, MemoCategory, MemoType, AIAnalysis, AIServiceConfig } from '../types';
import StorageService from './StorageService';
import { AI_MODELS } from '../constants';
import Groq from 'groq-sdk';

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
    apiKey: '***REMOVED***',
  };
  private groqClient: Groq | null = null;

  constructor() {
    // Initialize Groq client with the API key
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
      
      // Get sample transcription (in production, this would use actual speech-to-text)
      const transcription = await this.transcribeAudio(audioUri);
      console.log('Transcription:', transcription);
      
      // Analyze with Groq
      const analysis = await this.analyzeTranscription(transcription);
      console.log('Analysis completed:', analysis);
      
      return analysis;
    } catch (error) {
      console.error('Error in transcription and analysis:', error);
      // Fall back to mock data
      return this.mockTranscribeAndAnalyze();
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
      
      let audioFile: any;
      
      // Convert audio URI to File or Blob that Groq can accept
      if (audioUri.startsWith('data:audio/')) {
        // It's a data URI - convert to Blob
        const base64Data = audioUri.split(',')[1];
        const binaryString = atob(base64Data); // Browser's base64 decoder
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes as any], { 
          type: 'audio/webm',
          lastModified: Date.now()
        });
        // Convert Blob to File with a name
        audioFile = new File([blob], 'audio.webm', { 
          type: 'audio/webm',
          lastModified: Date.now()
        });
      } else if (audioUri.startsWith('file://')) {
        // It's a file URL - fetch and convert to File
        const response = await fetch(audioUri);
        const blob = await response.blob();
        audioFile = new File([blob], 'audio.m4a', { 
          type: 'audio/mp4',
          lastModified: Date.now()
        });
      } else {
        // Try to fetch as a URL
        try {
          const response = await fetch(audioUri);
          const blob = await response.blob();
          audioFile = new File([blob], 'audio.m4a', { 
            type: 'audio/mp4',
            lastModified: Date.now()
          });
        } catch (e) {
          console.error('Could not fetch audio from URI:', audioUri);
          return 'Audio not available for transcription';
        }
      }

      console.log('Sending audio file to Groq Whisper API...');
      const transcription = await this.groqClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3-turbo',
        language: 'en',
        response_format: 'text',
      });

      const transcribedText = typeof transcription === 'string' ? transcription : (transcription as any).text || '';
      console.log('Transcription from Groq Whisper:', transcribedText);
      return transcribedText;
    } catch (error) {
      console.error('Error transcribing audio with Groq:', error);
      return 'Transcription failed';
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
