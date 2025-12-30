/**
 * VoiceMemoService
 * Handles voice memo storage and retrieval using Supabase
 */

import { supabase } from '../config/supabase';
import { VoiceMemo } from '../types';
import StorageService from './StorageService';
import NotificationService from './NotificationService';

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
        // Fallback: Save to local storage only
        await StorageService.appendVoiceMemo(memo);
        return memo;
      }

      console.log('Memo saved to database:', data);
      
      // Also save to local storage for offline access/speed
      await StorageService.appendVoiceMemo(memo);
      
      return memo;
    } catch (error) {
      console.error('Error saving memo:', error);
      // Fallback
      await StorageService.appendVoiceMemo(memo);
      return memo;
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
        .or(`user_id.eq.${userId},shared_with.cs.[{"user_id": "${userId}"}]`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memos:', error);
        return await StorageService.getVoiceMemos();
      }

      const memos: VoiceMemo[] = data?.map((row: any) => ({
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
        isCompleted: row.is_completed,
        completedAt: row.completed_at,
        linkedActions: row.linked_actions
      })) || [];
        
      // Update local cache
      StorageService.saveVoiceMemos(memos).catch(console.error);
        
      return memos;
    } catch (error) {
      console.error('Error getting user memos:', error);
      return await StorageService.getVoiceMemos();
    }
  }

  /**
   * Get a single voice memo by ID
   */
  async getMemo(memoId: string): Promise<VoiceMemo | null> {
    try {
      // Check if user has access (either owner or shared)
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', memoId)
        .single();

      if (error) {
        console.error('Error fetching memo:', error);
        const localMemos = await StorageService.getVoiceMemos();
        return localMemos.find(m => m.id === memoId) || null;
      }

      if (!data) return null;

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
        isCompleted: data.is_completed,
        completedAt: data.completed_at,
        linkedActions: data.linked_actions,
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
          is_completed: memo.isCompleted,
          completed_at: memo.completedAt,
          linked_actions: memo.linkedActions
        })
        .eq('id', memo.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating memo:', error);
        await StorageService.appendVoiceMemo(memo);
        return memo;
      }

      console.log('Memo updated successfully:', data);
      await StorageService.appendVoiceMemo(memo);
      return memo;
    } catch (error) {
      console.error('Error updating memo:', error);
      await StorageService.appendVoiceMemo(memo);
      return memo;
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
      }

      // Remove from local storage
      const localMemos = await StorageService.getVoiceMemos();
      const newMemos = localMemos.filter(m => m.id !== memoId);
      await StorageService.saveVoiceMemos(newMemos);

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
        // Fallback local
        const localMemos = await StorageService.getVoiceMemos();
        const memo = localMemos.find(m => m.id === memoId);
        if (memo) {
            memo.isCompleted = true;
            memo.completedAt = new Date().toISOString();
            await StorageService.appendVoiceMemo(memo);
            return memo;
        }
        return null;
      }

      const updatedMemo = {
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
      };
      
      await StorageService.appendVoiceMemo(updatedMemo);
      return updatedMemo;
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
         // Fallback local
        const localMemos = await StorageService.getVoiceMemos();
        const memo = localMemos.find(m => m.id === memoId);
        if (memo) {
            memo.isCompleted = false;
            memo.completedAt = undefined;
            await StorageService.appendVoiceMemo(memo);
            return memo;
        }
        return null;
      }

      const updatedMemo = {
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
      };
      
      await StorageService.appendVoiceMemo(updatedMemo);
      return updatedMemo;
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
       const memo = await this.getMemo(memoId);
       if (!memo) return null;
       
       const linkedActions = memo.linkedActions || [];
       if (!linkedActions.includes(actionId)) {
         linkedActions.push(actionId);
         memo.linkedActions = linkedActions;
         memo.updatedAt = new Date().toISOString();
         return await this.updateMemo(memo);
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
        // Fallback local
        const local = await StorageService.getVoiceMemos();
        const lowerQ = query.toLowerCase();
        return local.filter(m => 
            m.title?.toLowerCase().includes(lowerQ) ||
            m.transcription?.toLowerCase().includes(lowerQ)
        );
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
          isCompleted: row.is_completed,
          completedAt: row.completed_at,
          linkedActions: row.linked_actions
        })) || []
      );
    } catch (error) {
      console.error('Error searching memos:', error);
      return [];
    }
  }
  /**
   * Share a memo with another user
   */
  async shareMemo(memoId: string, targetUserId: string, targetUserName: string): Promise<boolean> {
    try {
      const memo = await this.getMemo(memoId);
      if (!memo) return false;

      // Get current shared list or init
      // Note: We need to fetch the raw data to get shared_with field which might not be in the type yet
      const { data: currentData } = await supabase
        .from(this.TABLE_NAME)
        .select('shared_with')
        .eq('id', memoId)
        .single();
      
      const currentShared = currentData?.shared_with || [];
      
      // Check if already shared
      if (currentShared.some((m: any) => m.user_id === targetUserId)) {
        return true;
      }

      const newShared = [
        ...currentShared,
        { user_id: targetUserId, name: targetUserName, shared_at: new Date().toISOString() }
      ];

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ shared_with: newShared })
        .eq('id', memoId);

      if (error) {
        console.error('Error sharing memo:', error);
        return false;
      }

      // Send notification to target user
      try {
        await NotificationService.createNotification({
          userId: targetUserId,
          title: 'New Shared Memo',
          message: `${targetUserName} shared a memo with you: "${memo.title || 'Untitled Answer'}"`,
          type: 'system',
          data: { memoId: memo.id, type: 'shared_memo' }
        });
      } catch (notifyError) {
        console.error('Error sending notification for shared memo:', notifyError);
        // Don't fail the share if notification fails
      }

      return true;
    } catch (error) {
      console.error('Error in shareMemo:', error);
      return false;
    }
  }
}

export default new VoiceMemoService();
