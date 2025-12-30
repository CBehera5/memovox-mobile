/**
 * GoogleCalendarService
 * Handles Google Calendar API integration using expo-auth-session
 */

import axios from 'axios';
import AuthService from './AuthService';
import StorageService from './StorageService';

export interface GoogleCalendarEvent {
  id: string;
  summary: string; // Title
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  status?: string;
  htmlLink?: string;
}

class GoogleCalendarService {
  
  /**
   * Get the current access token from Supabase session
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      // 1. Check current session
      const session = await AuthService.getSession();
      if (session?.provider_token) {
        console.log('✅ Found provider token in active session');
        // Update local cache just in case
        await StorageService.setItem('google_provider_token', session.provider_token);
        return session.provider_token;
      }

      // 2. Fallback to local storage
      console.log('⚠️ No provider token in session, checking local storage...');
      const localToken = await StorageService.getItem('google_provider_token');
      
      if (localToken) {
        console.log('✅ Found provider token in local storage');
        return localToken;
      }

      console.warn('❌ No provider token found anywhere. User may need to re-authenticate with Google.');
      return null;
    } catch (error) {
      console.error('Error retrieval access token:', error);
      return null;
    }
  }

  /**
   * Check if user is signed in (has a provider token)
   */
  async isSignedIn(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  }

  /**
   * Sign out (Handled by AuthService globally now)
   */
  async signOut(): Promise<void> {
    // No-op for calendar specifically, handled by main auth
    console.log('Calendar sign out is handled by main application logout');
  }

  /**
   * Get user's calendar events
   */
  /**
   * Get user's calendar events
   */
  async getEvents(
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 50
  ): Promise<GoogleCalendarEvent[]> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.warn('Not signed in to Google Calendar (No provider token)');
        return [];
      }

      const params: any = {
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (timeMin) {
        params.timeMin = timeMin.toISOString();
      }
      if (timeMax) {
        params.timeMax = timeMax.toISOString();
      }

      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        }
      );

      console.log(`✅ Fetched ${response.data.items?.length || 0} Google Calendar events`);
      return response.data.items || [];
    } catch (error: any) {
      console.error('Error fetching calendar events:', error.response?.data || error);
      return [];
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
  }): Promise<GoogleCalendarEvent | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.warn('Not signed in to Google Calendar');
        return null;
      }

      const eventData = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        eventData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Created Google Calendar event:', response.data.summary);
      return response.data;
    } catch (error: any) {
      console.error('Error creating calendar event:', error.response?.data || error);
      return null;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
      location?: string;
    }
  ): Promise<GoogleCalendarEvent | null> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.warn('Not signed in to Google Calendar');
        return null;
      }

      const eventData: any = {};
      if (updates.title) eventData.summary = updates.title;
      if (updates.description) eventData.description = updates.description;
      if (updates.location) eventData.location = updates.location;
      
      if (updates.startTime) {
        eventData.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }
      
      if (updates.endTime) {
        eventData.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
      }

      const response = await axios.patch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        eventData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Updated Google Calendar event:', response.data.summary);
      return response.data;
    } catch (error: any) {
      console.error('Error updating calendar event:', error.response?.data || error);
      return null;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        console.warn('Not signed in to Google Calendar');
        return false;
      }

      await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log('✅ Deleted Google Calendar event');
      return true;
    } catch (error: any) {
      console.error('Error deleting calendar event:', error.response?.data || error);
      return false;
    }
  }

  /**
   * Get upcoming events (next 30 days)
   */
  async getUpcomingEvents(): Promise<GoogleCalendarEvent[]> {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return this.getEvents(now, thirtyDaysLater);
  }

  /**
   * Get today's events
   */
  async getTodayEvents(): Promise<GoogleCalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.getEvents(today, tomorrow);
  }
}

export default new GoogleCalendarService();
