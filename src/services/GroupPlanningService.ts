/**
 * GroupPlanningService
 * Handles real-time collaborative group planning sessions
 * Uses Supabase Realtime for syncing messages across all participants
 */

import { supabase } from '../config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Import ChatMessage from ChatService since it's defined there
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  audioUri?: string;
}

export interface GroupPlanningSession {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: GroupPlanningMember[];
  is_active: boolean;
}

export interface GroupPlanningMember {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  joined_at: string;
  is_active: boolean;
}

export interface GroupPlanningMessage extends ChatMessage {
  session_id: string;
  user_id: string;
  user_name: string;
}

class GroupPlanningServiceClass {
  private activeChannel: RealtimeChannel | null = null;
  private messageCallbacks: ((message: GroupPlanningMessage) => void)[] = [];
  private memberUpdateCallbacks: ((members: GroupPlanningMember[]) => void)[] = [];

  /**
   * Create a new group planning session
   */
  async createSession(
    creatorId: string,
    creatorName: string,
    title: string,
    members: GroupPlanningMember[]
  ): Promise<GroupPlanningSession> {
    try {
      // Include creator in members
      const allMembers = [
        {
          user_id: creatorId,
          name: creatorName,
          joined_at: new Date().toISOString(),
          is_active: true,
        },
        ...members,
      ];

      const { data, error } = await supabase
        .from('group_planning_sessions')
        .insert({
          title,
          created_by: creatorId,
          members: allMembers,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating group planning session:', error);
        throw new Error('Failed to create group planning session');
      }

      if (__DEV__) {
        console.log('✅ Group planning session created:', data.id);
      }

      return data;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<GroupPlanningSession | null> {
    try {
      const { data, error } = await supabase
        .from('group_planning_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getSession:', error);
      return null;
    }
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<GroupPlanningSession[]> {
    try {
      const { data, error } = await supabase
        .from('group_planning_sessions')
        .select('*')
        .contains('members', [{ user_id: userId }])
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Send a message to the group planning session
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    userName: string,
    message: Omit<ChatMessage, 'id'>
  ): Promise<GroupPlanningMessage | null> {
    try {
      const messageData: Omit<GroupPlanningMessage, 'id'> = {
        ...message,
        session_id: sessionId,
        user_id: userId,
        user_name: userName,
      };

      const { data, error } = await supabase
        .from('group_planning_messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        throw new Error('Failed to send message');
      }

      // Update session timestamp
      await supabase
        .from('group_planning_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (__DEV__) {
        console.log('✅ Message sent to group session');
      }

      return data;
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return null;
    }
  }

  /**
   * Get all messages for a session
   */
  async getMessages(sessionId: string): Promise<GroupPlanningMessage[]> {
    try {
      const { data, error } = await supabase
        .from('group_planning_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getMessages:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates for a session
   */
  subscribeToSession(
    sessionId: string,
    onMessage: (message: GroupPlanningMessage) => void,
    onMemberUpdate?: (members: GroupPlanningMember[]) => void
  ): RealtimeChannel {
    // Unsubscribe from previous channel if exists
    if (this.activeChannel) {
      this.unsubscribe();
    }

    if (__DEV__) {
      console.log('📡 Subscribing to group planning session:', sessionId);
    }

    // Create channel for this session
    this.activeChannel = supabase
      .channel(`group_planning:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_planning_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (__DEV__) {
            console.log('📨 New message received:', payload.new);
          }
          const message = payload.new as GroupPlanningMessage;
          onMessage(message);
          this.messageCallbacks.forEach(cb => cb(message));
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_planning_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (__DEV__) {
            console.log('👥 Session updated:', payload.new);
          }
          const session = payload.new as GroupPlanningSession;
          if (onMemberUpdate && session.members) {
            onMemberUpdate(session.members);
            this.memberUpdateCallbacks.forEach(cb => cb(session.members));
          }
        }
      )
      .subscribe((status) => {
        if (__DEV__) {
          console.log('📡 Realtime subscription status:', status);
        }
      });

    return this.activeChannel;
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribe() {
    if (this.activeChannel) {
      if (__DEV__) {
        console.log('📡 Unsubscribing from group planning session');
      }
      supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
    }
    this.messageCallbacks = [];
    this.memberUpdateCallbacks = [];
  }

  /**
   * Add a member to the session
   */
  async addMember(
    sessionId: string,
    member: GroupPlanningMember
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const updatedMembers = [...session.members, member];

      const { error } = await supabase
        .from('group_planning_sessions')
        .update({ members: updatedMembers, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error adding member:', error);
        return false;
      }

      if (__DEV__) {
        console.log('✅ Member added to session:', member.name);
      }

      return true;
    } catch (error) {
      console.error('Error in addMember:', error);
      return false;
    }
  }

  /**
   * Remove a member from the session
   */
  async removeMember(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const updatedMembers = session.members.filter(m => m.user_id !== userId);

      const { error } = await supabase
        .from('group_planning_sessions')
        .update({ members: updatedMembers, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error removing member:', error);
        return false;
      }

      if (__DEV__) {
        console.log('✅ Member removed from session');
      }

      return true;
    } catch (error) {
      console.error('Error in removeMember:', error);
      return false;
    }
  }

  /**
   * Mark user as active/inactive in session
   */
  async updateMemberStatus(
    sessionId: string,
    userId: string,
    isActive: boolean
  ): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      const updatedMembers = session.members.map(m =>
        m.user_id === userId ? { ...m, is_active: isActive } : m
      );

      const { error } = await supabase
        .from('group_planning_sessions')
        .update({ members: updatedMembers, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error updating member status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMemberStatus:', error);
      return false;
    }
  }

  /**
   * End the group planning session
   */
  async endSession(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_planning_sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) {
        console.error('Error ending session:', error);
        return false;
      }

      // Unsubscribe from realtime updates
      this.unsubscribe();

      if (__DEV__) {
        console.log('✅ Group planning session ended');
      }

      return true;
    } catch (error) {
      console.error('Error in endSession:', error);
      return false;
    }
  }

  /**
   * Register a callback for new messages
   */
  onMessage(callback: (message: GroupPlanningMessage) => void) {
    this.messageCallbacks.push(callback);
  }

  /**
   * Register a callback for member updates
   */
  onMemberUpdate(callback: (members: GroupPlanningMember[]) => void) {
    this.memberUpdateCallbacks.push(callback);
  }
}

export const GroupPlanningService = new GroupPlanningServiceClass();
