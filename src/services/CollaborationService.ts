// src/services/CollaborationService.ts
import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  invited_by?: string;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface SharedTask {
  id: string;
  title: string;
  description?: string;
  category?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  team_id?: string;
  created_by: string;
  assigned_to?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    id: string;
    email: string;
    full_name?: string;
  };
  creator?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface SharedMemo {
  id: string;
  title: string;
  transcription: string;
  audio_url?: string;
  category?: string;
  team_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface Comment {
  id: string;
  content: string;
  parent_type: 'task' | 'memo';
  parent_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'task_assigned' | 'task_completed' | 'task_mentioned' | 'comment_added' | 'memo_shared' | 'team_invite';
  title: string;
  message: string;
  reference_type?: 'task' | 'memo' | 'comment' | 'team';
  reference_id?: string;
  read: boolean;
  created_at: string;
}

export interface ActivityItem {
  id: string;
  team_id: string;
  user_id: string;
  action_type: 'task_created' | 'task_updated' | 'task_completed' | 'memo_shared' | 'comment_added' | 'member_joined';
  entity_type?: 'task' | 'memo' | 'comment' | 'member';
  entity_id?: string;
  description: string;
  created_at: string;
}

// ============================================
// COLLABORATION SERVICE
// ============================================

class CollaborationService {
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();

  // ============================================
  // TEAM MANAGEMENT
  // ============================================

  /**
   * Create a new team
   */
  async createTeam(name: string, description?: string): Promise<Team | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('teams')
        .insert({
          name,
          description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner member
      await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
        });

      console.log('✅ Team created:', data.name);
      return data;
    } catch (error: any) {
      console.error('Error creating team:', error);
      throw error;
    }
  }

  /**
   * Get all teams user belongs to
   */
  async getUserTeams(): Promise<Team[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .or(`owner_id.eq.${user.id},id.in.(select team_id from team_members where user_id='${user.id}')`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      return [];
    }
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching team:', error);
      return null;
    }
  }

  /**
   * Update team
   */
  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      console.log('✅ Team updated');
      return data;
    } catch (error: any) {
      console.error('Error updating team:', error);
      return null;
    }
  }

  /**
   * Delete team
   */
  async deleteTeam(teamId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
      console.log('✅ Team deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting team:', error);
      return false;
    }
  }

  // ============================================
  // TEAM MEMBERS MANAGEMENT
  // ============================================

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:profiles(id, email, full_name)
        `)
        .eq('team_id', teamId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching team members:', error);
      return [];
    }
  }

  /**
   * Add team member
   */
  async addTeamMember(teamId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role,
          invited_by: user.id,
        });

      if (error) throw error;

      // Create notification
      await this.createNotification(
        userId,
        'team_invite',
        'Team Invitation',
        'You have been invited to join a team',
        'team',
        teamId
      );

      console.log('✅ Team member added');
      return true;
    } catch (error: any) {
      console.error('Error adding team member:', error);
      return false;
    }
  }

  /**
   * Remove team member
   */
  async removeTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Team member removed');
      return true;
    } catch (error: any) {
      console.error('Error removing team member:', error);
      return false;
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Member role updated');
      return true;
    } catch (error: any) {
      console.error('Error updating member role:', error);
      return false;
    }
  }

  // ============================================
  // SHARED TASKS MANAGEMENT
  // ============================================

  /**
   * Create shared task
   */
  async createSharedTask(task: {
    title: string;
    description?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
    team_id?: string;
    assigned_to?: string;
  }): Promise<SharedTask | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_tasks')
        .insert({
          ...task,
          created_by: user.id,
          status: 'pending',
        })
        .select(`
          *,
          assigned_user:profiles!assigned_to(id, email, full_name),
          creator:profiles!created_by(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      console.log('✅ Shared task created:', data.title);
      return data;
    } catch (error: any) {
      console.error('Error creating shared task:', error);
      return null;
    }
  }

  /**
   * Get team tasks
   */
  async getTeamTasks(teamId: string, status?: string): Promise<SharedTask[]> {
    try {
      let query = supabase
        .from('shared_tasks')
        .select(`
          *,
          assigned_user:profiles!assigned_to(id, email, full_name),
          creator:profiles!created_by(id, email, full_name)
        `)
        .eq('team_id', teamId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching team tasks:', error);
      return [];
    }
  }

  /**
   * Get user's assigned tasks
   */
  async getMyAssignedTasks(): Promise<SharedTask[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_tasks')
        .select(`
          *,
          assigned_user:profiles!assigned_to(id, email, full_name),
          creator:profiles!created_by(id, email, full_name)
        `)
        .eq('assigned_to', user.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching assigned tasks:', error);
      return [];
    }
  }

  /**
   * Update shared task
   */
  async updateSharedTask(taskId: string, updates: Partial<SharedTask>): Promise<SharedTask | null> {
    try {
      const { data, error } = await supabase
        .from('shared_tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          assigned_user:profiles!assigned_to(id, email, full_name),
          creator:profiles!created_by(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      console.log('✅ Task updated');
      return data;
    } catch (error: any) {
      console.error('Error updating task:', error);
      return null;
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_tasks')
        .update({ assigned_to: userId })
        .eq('id', taskId);

      if (error) throw error;
      console.log('✅ Task assigned');
      return true;
    } catch (error: any) {
      console.error('Error assigning task:', error);
      return false;
    }
  }

  /**
   * Complete task
   */
  async completeTask(taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (error) throw error;
      console.log('✅ Task completed');
      return true;
    } catch (error: any) {
      console.error('Error completing task:', error);
      return false;
    }
  }

  /**
   * Delete shared task
   */
  async deleteSharedTask(taskId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      console.log('✅ Task deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // ============================================
  // SHARED MEMOS MANAGEMENT
  // ============================================

  /**
   * Share memo with team
   */
  async shareMemo(memo: {
    title: string;
    transcription: string;
    audio_url?: string;
    category?: string;
    team_id: string;
  }): Promise<SharedMemo | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('shared_memos')
        .insert({
          ...memo,
          created_by: user.id,
        })
        .select(`
          *,
          creator:profiles!created_by(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      console.log('✅ Memo shared:', data.title);
      return data;
    } catch (error: any) {
      console.error('Error sharing memo:', error);
      return null;
    }
  }

  /**
   * Get team memos
   */
  async getTeamMemos(teamId: string): Promise<SharedMemo[]> {
    try {
      const { data, error } = await supabase
        .from('shared_memos')
        .select(`
          *,
          creator:profiles!created_by(id, email, full_name)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching team memos:', error);
      return [];
    }
  }

  /**
   * Delete shared memo
   */
  async deleteSharedMemo(memoId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('shared_memos')
        .delete()
        .eq('id', memoId);

      if (error) throw error;
      console.log('✅ Memo deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting memo:', error);
      return false;
    }
  }

  // ============================================
  // COMMENTS MANAGEMENT
  // ============================================

  /**
   * Add comment
   */
  async addComment(
    parentType: 'task' | 'memo',
    parentId: string,
    content: string
  ): Promise<Comment | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          parent_type: parentType,
          parent_id: parentId,
          content,
          created_by: user.id,
        })
        .select(`
          *,
          author:profiles!created_by(id, email, full_name)
        `)
        .single();

      if (error) throw error;
      console.log('✅ Comment added');
      return data;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      return null;
    }
  }

  /**
   * Get comments for item
   */
  async getComments(parentType: 'task' | 'memo', parentId: string): Promise<Comment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!created_by(id, email, full_name)
        `)
        .eq('parent_type', parentType)
        .eq('parent_id', parentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      console.log('✅ Comment deleted');
      return true;
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      return false;
    }
  }

  // ============================================
  // NOTIFICATIONS MANAGEMENT
  // ============================================

  /**
   * Get user notifications
   */
  async getNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id);

      if (unreadOnly) {
        query = query.eq('read', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      console.log('✅ All notifications marked as read');
      return true;
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Create notification (internal use)
   */
  private async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    referenceType?: Notification['reference_type'],
    referenceId?: string
  ): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          reference_type: referenceType,
          reference_id: referenceId,
        });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  // ============================================
  // ACTIVITY FEED
  // ============================================

  /**
   * Get team activity feed
   */
  async getTeamActivity(teamId: string, limit: number = 20): Promise<ActivityItem[]> {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching activity feed:', error);
      return [];
    }
  }

  // ============================================
  // REAL-TIME SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe to team updates
   */
  subscribeToTeam(
    teamId: string,
    callbacks: {
      onTaskUpdate?: (task: SharedTask) => void;
      onMemoUpdate?: (memo: SharedMemo) => void;
      onCommentUpdate?: (comment: Comment) => void;
      onActivityUpdate?: (activity: ActivityItem) => void;
    }
  ): () => void {
    const channelName = `team_${teamId}`;

    // Unsubscribe if already subscribed
    if (this.realtimeChannels.has(channelName)) {
      this.unsubscribeFromTeam(teamId);
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_tasks',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (callbacks.onTaskUpdate) {
            callbacks.onTaskUpdate(payload.new as SharedTask);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_memos',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (callbacks.onMemoUpdate) {
            callbacks.onMemoUpdate(payload.new as SharedMemo);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (callbacks.onActivityUpdate) {
            callbacks.onActivityUpdate(payload.new as ActivityItem);
          }
        }
      )
      .subscribe();

    this.realtimeChannels.set(channelName, channel);

    console.log(`✅ Subscribed to team: ${teamId}`);

    // Return unsubscribe function
    return () => this.unsubscribeFromTeam(teamId);
  }

  /**
   * Unsubscribe from team updates
   */
  unsubscribeFromTeam(teamId: string): void {
    const channelName = `team_${teamId}`;
    const channel = this.realtimeChannels.get(channelName);

    if (channel) {
      supabase.removeChannel(channel);
      this.realtimeChannels.delete(channelName);
      console.log(`✅ Unsubscribed from team: ${teamId}`);
    }
  }

  /**
   * Subscribe to notifications
   */
  async subscribeToNotifications(callback: (notification: Notification) => void): Promise<() => void> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.warn('Cannot subscribe to notifications: not authenticated');
      return () => {};
    }

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    console.log('✅ Subscribed to notifications');

    return () => {
      supabase.removeChannel(channel);
      console.log('✅ Unsubscribed from notifications');
    };
  }

  /**
   * Cleanup all subscriptions
   */
  cleanup(): void {
    this.realtimeChannels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.realtimeChannels.clear();
    console.log('✅ All realtime subscriptions cleaned up');
  }
}

export default new CollaborationService();
