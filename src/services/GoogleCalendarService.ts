/**
 * GoogleCalendarService
 * Handles Google Calendar API integration using expo-auth-session
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import { 
  GOOGLE_CLIENT_ID_ANDROID, 
  GOOGLE_CLIENT_ID_IOS, 
  GOOGLE_CLIENT_ID_WEB 
} from '../config/env';

// Required for web browser to close properly after auth
WebBrowser.maybeCompleteAuthSession();

const STORAGE_KEY = 'google_calendar_token';
const REFRESH_TOKEN_KEY = 'google_calendar_refresh_token';

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
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;

  constructor() {
    this.loadTokens();
  }

  /**
   * Load stored tokens
   */
  private async loadTokens(): Promise<void> {
    try {
      const [storedAccessToken, storedRefreshToken] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
      ]);
      
      this.accessToken = storedAccessToken;
      this.refreshTokenValue = storedRefreshToken;
      
      if (this.accessToken) {
        console.log('✅ Loaded stored Google Calendar tokens');
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        this.refreshTokenValue = refreshToken;
      }
      this.accessToken = accessToken;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  /**
   * Get the appropriate client ID for the current platform
   */
  private getClientId(): string {
    const clientId = Platform.select({
      android: GOOGLE_CLIENT_ID_ANDROID,
      ios: GOOGLE_CLIENT_ID_IOS,
      default: GOOGLE_CLIENT_ID_WEB,
    });

    if (!clientId || clientId.includes('YOUR_')) {
      console.warn('⚠️  Google Calendar: Client ID not configured properly');
    }

    return clientId || '';
  }

  /**
   * Sign in to Google and request calendar permissions
   */
  async signIn(): Promise<boolean> {
    try {
      const clientId = this.getClientId();
      if (!clientId || clientId.includes('YOUR_')) {
        console.warn('Google Calendar not configured - please add client IDs to .env.local');
        return false;
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'memovox',
        path: 'auth',
      });

      console.log('Redirect URI:', redirectUri);

      const authRequest = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        scopes: [
          'openid',
          'profile',
          'email',
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events',
        ],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await authRequest.promptAsync(
        { authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth' }
      );

      if (result.type === 'success' && result.params.code) {
        // Exchange authorization code for access token
        const tokenResult = await this.exchangeCodeForToken(
          result.params.code,
          authRequest.codeVerifier!,
          redirectUri,
          clientId
        );

        if (tokenResult) {
          console.log('✅ Signed in to Google Calendar');
          return true;
        }
      }

      console.log('Sign in cancelled or failed');
      return false;
    } catch (error: any) {
      console.error('Error signing in to Google:', error);
      return false;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    clientId: string
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = response.data;
      await this.saveTokens(access_token, refresh_token);
      return true;
    } catch (error: any) {
      console.error('Error exchanging code for token:', error.response?.data || error);
      return false;
    }
  }

  /**
   * Check if user is signed in
   */
  async isSignedIn(): Promise<boolean> {
    if (!this.accessToken) {
      await this.loadTokens();
    }
    return !!this.accessToken;
  }

  /**
   * Sign out from Google
   */
  async signOut(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, REFRESH_TOKEN_KEY]);
      this.accessToken = null;
      this.refreshTokenValue = null;
      console.log('✅ Signed out from Google Calendar');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  /**
   * Get user's calendar events
   */
  async getEvents(
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = 50
  ): Promise<GoogleCalendarEvent[]> {
    try {
      if (!this.accessToken) {
        const signedIn = await this.isSignedIn();
        if (!signedIn) {
          console.warn('Not signed in to Google Calendar');
          return [];
        }
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
            Authorization: `Bearer ${this.accessToken}`,
          },
          params,
        }
      );

      console.log(`✅ Fetched ${response.data.items?.length || 0} Google Calendar events`);
      return response.data.items || [];
    } catch (error: any) {
      console.error('Error fetching calendar events:', error.response?.data || error);
      
      // If unauthorized, try to refresh token
      if (error.response?.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry once
          return this.getEvents(timeMin, timeMax, maxResults);
        }
      }
      
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
      if (!this.accessToken) {
        const signedIn = await this.isSignedIn();
        if (!signedIn) {
          console.warn('Not signed in to Google Calendar');
          return null;
        }
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
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Created Google Calendar event:', response.data.summary);
      return response.data;
    } catch (error: any) {
      console.error('Error creating calendar event:', error.response?.data || error);
      
      // If unauthorized, try to refresh token
      if (error.response?.status === 401) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry once
          return this.createEvent(event);
        }
      }
      
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
      if (!this.accessToken) {
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
            Authorization: `Bearer ${this.accessToken}`,
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
      if (!this.accessToken) {
        console.warn('Not signed in to Google Calendar');
        return false;
      }

      await axios.delete(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
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
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    try {
      if (!this.refreshTokenValue) {
        console.warn('No refresh token available');
        await this.signOut();
        return false;
      }

      const clientId = this.getClientId();
      
      const response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: clientId,
          refresh_token: this.refreshTokenValue,
          grant_type: 'refresh_token',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token } = response.data;
      await this.saveTokens(access_token);
      console.log('✅ Refreshed Google Calendar access token');
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // Sign out if refresh fails
      await this.signOut();
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
