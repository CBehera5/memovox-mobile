
import { supabase } from '../config/supabase';
import { User } from '../types';

export interface GroupSession {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  members: GroupMember[];
  is_active: boolean;
}

export interface GroupMember {
  user_id: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at?: string;
}

class GroupService {
  
  /**
   * Create a new group
   */
  async createGroup(title: string, creator: User, initialMembers: string[] = []): Promise<GroupSession | null> {
    try {
      // 1. Get authenticated user to ensure RLS compliance
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const userId = user.id;
      
      const members: GroupMember[] = [
        { user_id: userId, name: creator.name || 'Owner', role: 'owner', joined_at: new Date().toISOString() }
      ];

      // Add other initial members (logic to fetch their names would be needed in a real app, 
      // for now simplistic)
      // In a real flow, you'd likely Invite them. 
      // For this MVP, we might skipped adding others initially or handle it via invite link.

      const { data, error } = await supabase
        .from('group_planning_sessions')
        .insert({
          title,
          created_by: userId, // Use auth user id
          members: members,
          is_active: true
        })
        .select()
        .single();

      if (error) {
          console.error('Supabase Error:', error);
          throw error;
      };
      
      return data;
    } catch (error) {
      console.error('Error creating group:', error);
      // Re-throw to show actual error in UI if needed, or handle gracefully
      return null;
    }
  }

  /**
   * Get groups for a user
   */
  async getUserGroups(userId: string): Promise<GroupSession[]> {
    try {
      const { data, error } = await supabase
        .from('group_planning_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter locally since RLS handles "Users can view sessions they are members of"
      // strictly speaking, the RLS policy I wrote:
      // members @> cast('[{"user_id": "' || auth.uid() || '"}]' as jsonb)
      // So the select returns only relevant rows.
      return data || [];
    } catch (error) {
      console.error('Error fetching user groups:', error);
      return [];
    }
  }

  /**
   * Add a member to a group
   */
  async addMember(groupId: string, user: { id: string, name: string }, role: 'member' | 'admin' = 'member'): Promise<boolean> {
    try {
        // 1. Get current members
        const { data: group } = await supabase
            .from('group_planning_sessions')
            .select('members')
            .eq('id', groupId)
            .single();
            
        if (!group) return false;
        
        const currentMembers: GroupMember[] = group.members || [];
        if (currentMembers.some(m => m.user_id === user.id)) {
            return true; // Already member
        }
        
        const newMember: GroupMember = {
            user_id: user.id,
            name: user.name,
            role,
            joined_at: new Date().toISOString()
        };
        
        const updatedMembers = [...currentMembers, newMember];
        
        const { error } = await supabase
            .from('group_planning_sessions')
            .update({ members: updatedMembers })
            .eq('id', groupId);
            
        if (error) throw error;
        
        // Notify the new member
        try {
            const { default: NotificationService } = await import('./NotificationService');
            // Get group title for notification
            const { data: groupTitle } = await supabase
                .from('group_planning_sessions')
                .select('title')
                .eq('id', groupId)
                .single();
                
            await NotificationService.createNotification({
                userId: user.id,
                title: 'Added to Group',
                message: `You have been added to the group "${groupTitle?.title || 'Planning Group'}"`,
                type: 'group_invite',
                data: { groupId }
            });
        } catch (nError) {
            console.error('Error sending group notification:', nError);
            // Don't fail the operation if notification fails
        }

        return true;
    } catch (error) {
        console.error('Error adding member:', error);
        return false;
    }
  }
}

export default new GroupService();
