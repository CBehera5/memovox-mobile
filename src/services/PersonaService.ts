// src/services/PersonaService.ts

import { VoiceMemo, UserPersona, MemoCategory } from '../types';
import StorageService from './StorageService';
import AIService from './AIService';
import NotificationService from './NotificationService';

class PersonaService {
  async updatePersona(userId: string, memos: VoiceMemo[]): Promise<UserPersona> {
    try {
      const existingPersona = await StorageService.getUserPersona();
      
      // Extract interests from memo keywords
      const interests = this.extractInterests(memos);
      
      // Analyze communication style
      const communicationStyle = this.analyzeCommunicationStyle(memos);
      
      // Determine active hours
      const activeHours = this.determineActiveHours(memos);
      
      // Calculate category preferences
      const categoryPreferences = this.calculateCategoryPreferences(memos);
      
      // Extract top keywords
      const topKeywords = this.extractTopKeywords(memos);

      const persona: UserPersona = {
        userId,
        interests,
        communicationStyle,
        activeHours,
        categoryPreferences,
        topKeywords,
        lastUpdated: new Date().toISOString(),
      };

      await StorageService.saveUserPersona(persona);
      
      // Generate proactive insights
      await this.generateProactiveInsights(userId, persona, memos);
      
      return persona;
    } catch (error) {
      console.error('Error updating persona:', error);
      throw error;
    }
  }

  private extractInterests(memos: VoiceMemo[]): string[] {
    const interests = new Set<string>();
    
    memos.forEach(memo => {
      if (memo.aiAnalysis?.keywords) {
        memo.aiAnalysis.keywords.forEach(keyword => {
          interests.add(keyword.toLowerCase());
        });
      }
    });

    // Return top 20 most common interests
    return Array.from(interests).slice(0, 20);
  }

  private analyzeCommunicationStyle(memos: VoiceMemo[]): string {
    // Analyze average memo length, complexity, etc.
    const avgLength = memos.reduce((sum, memo) => sum + memo.transcription.length, 0) / memos.length;
    
    if (avgLength < 50) {
      return 'concise';
    } else if (avgLength < 150) {
      return 'moderate';
    } else {
      return 'detailed';
    }
  }

  private determineActiveHours(memos: VoiceMemo[]): { start: number; end: number } {
    const hours = memos.map(memo => new Date(memo.createdAt).getHours());
    
    if (hours.length === 0) {
      return { start: 9, end: 17 }; // Default to business hours
    }

    const sortedHours = hours.sort((a, b) => a - b);
    const start = sortedHours[0];
    const end = sortedHours[sortedHours.length - 1];
    
    return { start, end };
  }

  private calculateCategoryPreferences(memos: VoiceMemo[]): Partial<Record<MemoCategory, number>> {
    const preferences: Partial<Record<MemoCategory, number>> = {};
    
    memos.forEach(memo => {
      preferences[memo.category] = (preferences[memo.category] || 0) + 1;
    });

    // Convert to percentages
    const total = memos.length;
    Object.keys(preferences).forEach(category => {
      preferences[category as MemoCategory] = 
        Math.round((preferences[category as MemoCategory]! / total) * 100);
    });

    return preferences;
  }

  private extractTopKeywords(memos: VoiceMemo[]): Array<{ word: string; count: number }> {
    const keywordCounts: Record<string, number> = {};
    
    memos.forEach(memo => {
      if (memo.aiAnalysis?.keywords) {
        memo.aiAnalysis.keywords.forEach(keyword => {
          const normalized = keyword.toLowerCase();
          keywordCounts[normalized] = (keywordCounts[normalized] || 0) + 1;
        });
      }
    });

    return Object.entries(keywordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private async generateProactiveInsights(userId: string, persona: UserPersona, memos: VoiceMemo[]): Promise<void> {
    try {
      // Find forgotten ideas (ideas older than 2 weeks with no follow-up)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const forgottenIdeas = memos.filter(memo => 
        memo.category === 'Ideas' && 
        new Date(memo.createdAt) < twoWeeksAgo &&
        !memo.aiAnalysis?.relatedMemos?.length
      );

      for (const idea of forgottenIdeas.slice(0, 2)) {
        const insight = `You had an idea about "${idea.title || idea.transcription.substring(0, 50)}..." two weeks ago. Want to revisit it?`;
        await NotificationService.createInsightNotification(userId, insight);
      }

      // Pattern-based insights
      const topCategory = Object.entries(persona.categoryPreferences)
        .sort(([, a], [, b]) => b - a)[0];

      if (topCategory && topCategory[1] > 40) {
        const insight = `You've been focused on ${topCategory[0]} lately (${topCategory[1]}% of memos). Need help organizing this area?`;
        await NotificationService.createInsightNotification(userId, insight);
      }

      // Interest-based suggestions
      if (persona.topKeywords.length > 0) {
        const topInterest = persona.topKeywords[0];
        if (topInterest.count > 5) {
          const insight = `You've mentioned "${topInterest.word}" ${topInterest.count} times. Want to explore this topic further?`;
          await NotificationService.createInsightNotification(userId, insight);
        }
      }
    } catch (error) {
      console.error('Error generating proactive insights:', error);
    }
  }

  async getPersonaSummary(userId: string): Promise<string> {
    try {
      const persona = await StorageService.getUserPersona();
      
      if (!persona) {
        return 'No persona data available yet. Start recording memos to build your profile!';
      }

      const topCategory = Object.entries(persona.categoryPreferences)
        .sort(([, a], [, b]) => b - a)[0];

      const topInterests = persona.topKeywords.slice(0, 3).map(k => k.word);

      return `You're a ${persona.communicationStyle} communicator who focuses mainly on ${topCategory?.[0] || 'various topics'}. Your top interests include: ${topInterests.join(', ')}. Most active between ${persona.activeHours.start}:00 and ${persona.activeHours.end}:00.`;
    } catch (error) {
      console.error('Error getting persona summary:', error);
      return 'Unable to generate persona summary.';
    }
  }

  async suggestOptimalTimes(userId: string): Promise<string[]> {
    try {
      const persona = await StorageService.getUserPersona();
      
      if (!persona) {
        return [];
      }

      const suggestions: string[] = [];
      
      // Suggest based on active hours
      suggestions.push(`Best time to record: ${persona.activeHours.start}:00 - ${persona.activeHours.end}:00`);
      
      // Suggest based on patterns
      const topCategory = Object.entries(persona.categoryPreferences)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topCategory) {
        suggestions.push(`You often record ${topCategory[0]} memos - consider setting aside time for this`);
      }

      return suggestions;
    } catch (error) {
      console.error('Error suggesting optimal times:', error);
      return [];
    }
  }
}

export default new PersonaService();