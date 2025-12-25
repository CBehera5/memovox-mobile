/**
 * VoiceMemoService
 * Handles voice memo storage and retrieval using Supabase
 */

import { supabase } from '../config/supabase';
import { VoiceMemo } from '../types';

export class VoiceMemoService {
  private readonly BUCKET_NAME = 'voice-memos';
  private readonly TABLE_NAME = 'voice_memos';

  /**
   * Initialize the storage bucket (run once on app startup)
   */
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();

      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some((b) => b.name === this.BUCKET_NAME);

      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(
          this.BUCKET_NAME,
          {
            public: false,
          }
        );

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log('Voice memos bucket created successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing bucket:', error);
    }
  }

  /**
   * Upload voice memo audio to Supabase Storage
   */
  async uploadAudio(
    userId: string,
    memoId: string,
    audioUri: string,
    audioData: Blob | Buffer
  ): Promise<string | null> {
    try {
      const filename = `${userId}/${memoId}.m4a`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filename, audioData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Fallback to local URI - this is expected behavior when offline or Supabase is unreachable
        return audioUri;
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filename);

      return publicData.publicUrl;
    } catch (error) {
      // Return local URI as fallback - app will work with local files
      return audioUri;
    }
  }

  /**
   * Save voice memo to database
   */
  async saveMemo(memo: VoiceMemo): Promise<VoiceMemo | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([
          {
            id: memo.id,
            user_id: memo.userId,
            audio_url: memo.audioUri,
            transcription: memo.transcription,
            category: memo.category,
            type: memo.type,
            title: memo.title,
            duration: memo.duration,
            ai_analysis: memo.aiAnalysis,
            metadata: memo.metadata,
            created_at: memo.createdAt,
            updated_at: memo.updatedAt,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error saving memo:', error);
        return null;
      }

      console.log('Memo saved to database:', data);
      return memo;
    } catch (error) {
      console.error('Error saving memo:', error);
      return null;
    }
  }

  /**
   * Get all voice memos for a user
   */
  async getUserMemos(userId: string): Promise<VoiceMemo[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memos:', error);
        return [];
      }

      return (
        data?.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          audioUri: row.audio_url,
          transcription: row.transcription,
          category: row.category,
          type: row.type,
          title: row.title,
          duration: row.duration,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          aiAnalysis: row.ai_analysis,
          metadata: row.metadata,
        })) || []
      );
    } catch (error) {
      console.error('Error getting user memos:', error);
      return [];
    }
  }

  /**
   * Get a single voice memo by ID
   */
  async getMemo(memoId: string): Promise<VoiceMemo | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', memoId)
        .single();

      if (error) {
        console.error('Error fetching memo:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        audioUri: data.audio_url,
        transcription: data.transcription,
        category: data.category,
        type: data.type,
        title: data.title,
        duration: data.duration,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        aiAnalysis: data.ai_analysis,
        metadata: data.metadata,
      };
    } catch (error) {
      console.error('Error getting memo:', error);
      return null;
    }
  }

  /**
   * Update a voice memo
   */
  async updateMemo(memo: VoiceMemo): Promise<VoiceMemo | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          title: memo.title,
          transcription: memo.transcription,
          category: memo.category,
          type: memo.type,
          ai_analysis: memo.aiAnalysis,
          metadata: memo.metadata,
          updated_at: memo.updatedAt,
        })
        .eq('id', memo.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating memo:', error);
        return null;
      }

      console.log('Memo updated successfully:', data);
      return memo;
    } catch (error) {
      console.error('Error updating memo:', error);
      return null;
    }
  }

  /**
   * Delete a voice memo
   */
  async deleteMemo(memoId: string, userId: string): Promise<boolean> {
    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', memoId)
        .eq('user_id', userId);

      if (dbError) {
        console.error('Error deleting memo from database:', dbError);
        return false;
      }

      // Delete audio file
      const filename = `${userId}/${memoId}.m4a`;
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filename]);

      if (storageError) {
        console.error('Error deleting audio file:', storageError);
        // Don't fail if storage deletion fails, DB deletion was successful
      }

      console.log('Memo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting memo:', error);
      return false;
    }
  }

  /**
   * Mark a memo as completed
   */
  async completeMemo(memoId: string, userId: string): Promise<VoiceMemo | null> {
    try {
      // For development mode with local storage
      const StorageService = require('./StorageService').default;
      const memos = await StorageService.getVoiceMemos();
      
      const memo = memos.find((m: VoiceMemo) => m.id === memoId && m.userId === userId);
      
      if (!memo) {
        console.error('Memo not found:', memoId);
        return null;
      }
      
      // Update memo with completion data
      memo.isCompleted = true;
      memo.completedAt = new Date().toISOString();
      memo.updatedAt = new Date().toISOString();
      
      // Save back to storage
      await StorageService.saveVoiceMemos(memos);
      
      console.log('Memo marked as completed:', memoId);
      return memo;
      
      // PRODUCTION: Supabase database update (commented out for development)
      /*
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error completing memo:', error);
        return null;
      }

      return data ? {
        id: data.id,
        userId: data.user_id,
        audioUri: data.audio_url,
        transcription: data.transcription,
        category: data.category,
        type: data.type,
        title: data.title,
        duration: data.duration,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isCompleted: data.is_completed,
        completedAt: data.completed_at,
        linkedActions: data.linked_actions,
        aiAnalysis: data.ai_analysis,
        metadata: data.metadata,
      } : null;
      */
    } catch (error) {
      console.error('Error completing memo:', error);
      return null;
    }
  }

  /**
   * Unmark a memo as completed (toggle back to incomplete)
   */
  async uncompleteMemo(memoId: string, userId: string): Promise<VoiceMemo | null> {
    try {
      // For development mode with local storage
      const StorageService = require('./StorageService').default;
      const memos = await StorageService.getVoiceMemos();
      
      const memo = memos.find((m: VoiceMemo) => m.id === memoId && m.userId === userId);
      
      if (!memo) {
        console.error('Memo not found:', memoId);
        return null;
      }
      
      // Update memo to remove completion data
      memo.isCompleted = false;
      memo.completedAt = undefined;
      memo.updatedAt = new Date().toISOString();
      
      // Save back to storage
      await StorageService.saveVoiceMemos(memos);
      
      console.log('Memo marked as incomplete:', memoId);
      return memo;
      
      // PRODUCTION: Supabase database update (commented out for development)
      /*
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          is_completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error uncompleting memo:', error);
        return null;
      }

      return data ? {
        id: data.id,
        userId: data.user_id,
        audioUri: data.audio_url,
        transcription: data.transcription,
        category: data.category,
        type: data.type,
        title: data.title,
        duration: data.duration,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        isCompleted: data.is_completed,
        completedAt: data.completed_at,
        linkedActions: data.linked_actions,
        aiAnalysis: data.ai_analysis,
        metadata: data.metadata,
      } : null;
      */
    } catch (error) {
      console.error('Error uncompleting memo:', error);
      return null;
    }
  }

  /**
   * Link an action to a memo
   */
  async linkActionToMemo(memoId: string, userId: string, actionId: string): Promise<VoiceMemo | null> {
    try {
      // For development mode with local storage
      const StorageService = require('./StorageService').default;
      const memos = await StorageService.getVoiceMemos();
      
      const memo = memos.find((m: VoiceMemo) => m.id === memoId && m.userId === userId);
      
      if (!memo) {
        console.error('Memo not found:', memoId);
        return null;
      }
      
      // Initialize linkedActions if not exists
      if (!memo.linkedActions) {
        memo.linkedActions = [];
      }
      
      // Add action ID if not already linked
      if (!memo.linkedActions.includes(actionId)) {
        memo.linkedActions.push(actionId);
        memo.updatedAt = new Date().toISOString();
        
        // Save back to storage
        await StorageService.saveVoiceMemos(memos);
        
        console.log('Action linked to memo:', actionId, '→', memoId);
      }
      
      return memo;
    } catch (error) {
      console.error('Error linking action to memo:', error);
      return null;
    }
  }

  /**
   * Search memos by query
   */
  async searchMemos(userId: string, query: string): Promise<VoiceMemo[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .or(
          `title.ilike.%${query}%,transcription.ilike.%${query}%,category.ilike.%${query}%`
        )
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error searching memos:', error);
        return [];
      }

      return (
        data?.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          audioUri: row.audio_url,
          transcription: row.transcription,
          category: row.category,
          type: row.type,
          title: row.title,
          duration: row.duration,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          aiAnalysis: row.ai_analysis,
          metadata: row.metadata,
        })) || []
      );
    } catch (error) {
      console.error('Error searching memos:', error);
      return [];
    }
  }
}

export default new VoiceMemoService();
