import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// ================================================
// TYPES & INTERFACES
// ================================================

export interface Subscription {
  id: string;
  userId: string;
  planType: 'free' | 'premium' | 'pro' | 'enterprise';
  planDisplayName: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionStartDate: string | null;
  subscriptionEndDate: string | null;
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'suspended';
  daysRemaining: number;
  features: PlanFeatures;
}

export interface PlanFeatures {
  voice_memos_limit: number; // -1 for unlimited
  ai_insights: boolean;
  ai_chat: boolean;
  languages: number;
  storage_mb: number;
  collaboration: boolean;
  calendar_integration: boolean;
  export_pdf: boolean;
  priority_support: boolean;
  team_members: number;
  api_access: boolean;
  custom_categories: boolean;
  advanced_analytics: boolean;
}

export interface UsageStats {
  voiceMemosUsed: number;
  voiceMemosLimit: number;
  aiRequestsUsed: number;
  storageUsedMb: number;
  storageLimitMb: number;
}

export interface SubscriptionPlan {
  id: string;
  planName: string;
  displayName: string;
  description: string;
  monthlyPriceInr: number;
  monthlyPriceUsd: number;
  yearlyPriceInr: number;
  yearlyPriceUsd: number;
  features: PlanFeatures;
  isActive: boolean;
  sortOrder: number;
}

// ================================================
// SUBSCRIPTION SERVICE
// ================================================

class SubscriptionService {
  private static instance: SubscriptionService;
  private subscription: Subscription | null = null;
  private usageStats: UsageStats | null = null;
  private cacheTimestamp: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  // ================================================
  // SUBSCRIPTION MANAGEMENT
  // ================================================

  /**
   * Get user's current subscription with full details
   */
  async getSubscription(forceRefresh: boolean = false): Promise<Subscription | null> {
    try {
      // BYPASS: Always return Pro subscription for testing
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user');
        return null;
      }

      // Return mock Pro subscription
      this.subscription = {
        id: 'pro-bypass-' + user.id,
        userId: user.id,
        planType: 'pro',
        planDisplayName: 'Pro Plan',
        trialStartDate: null,
        trialEndDate: null,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: null, // No expiry
        status: 'active',
        daysRemaining: 999,
        features: {
          voice_memos_limit: -1, // Unlimited
          ai_insights: true,
          ai_chat: true,
          languages: 999,
          storage_mb: 999999,
          collaboration: true,
          calendar_integration: true,
          export_pdf: true,
          priority_support: true,
          team_members: 999,
          api_access: true,
          custom_categories: true,
          advanced_analytics: true,
        },
      };

      this.cacheTimestamp = Date.now();
      await this.cacheSubscription(this.subscription);
      
      return this.subscription;
    } catch (error) {
      console.error('Error in getSubscription:', error);
      return null;
    }
  }

  /**
   * Check if user is currently in trial period
   */
  async isInTrial(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription?.status === 'trial';
  }

  /**
   * Check if user has an active subscription (trial or paid)
   */
  async hasActiveSubscription(): Promise<boolean> {
    const subscription = await this.getSubscription();
    return subscription?.status === 'trial' || subscription?.status === 'active';
  }

  /**
   * Get days remaining in current subscription/trial
   */
  async getDaysRemaining(): Promise<number> {
    const subscription = await this.getSubscription();
    return subscription?.daysRemaining || 0;
  }

  /**
   * Get trial days remaining specifically
   */
  async getTrialDaysRemaining(): Promise<number> {
    const subscription = await this.getSubscription();
    if (subscription?.status === 'trial') {
      return subscription.daysRemaining || 0;
    }
    return 0;
  }

  // ================================================
  // FEATURE ACCESS CONTROL
  // ================================================

  /**
   * Check if user has access to a specific feature
   */
  async hasFeatureAccess(featureName: string): Promise<boolean> {
    // BYPASS: Pro users have access to all features
    return true;
  }

  /**
   * Check if user can access AI insights
   */
  async canUseAIInsights(): Promise<boolean> {
    return await this.hasFeatureAccess('ai_insights');
  }

  /**
   * Check if user can access AI chat
   */
  async canUseAIChat(): Promise<boolean> {
    return await this.hasFeatureAccess('ai_chat');
  }

  /**
   * Check if user can use collaboration features
   */
  async canUseCollaboration(): Promise<boolean> {
    return await this.hasFeatureAccess('collaboration');
  }

  /**
   * Check if user can integrate calendar
   */
  async canIntegrateCalendar(): Promise<boolean> {
    return await this.hasFeatureAccess('calendar_integration');
  }

  // ================================================
  // USAGE TRACKING & LIMITS
  // ================================================

  /**
   * Get current month's usage statistics
   */
  async getUsageStats(forceRefresh: boolean = false): Promise<UsageStats | null> {
    try {
      // BYPASS: Return unlimited usage for Pro users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      this.usageStats = {
        voiceMemosUsed: 0,
        voiceMemosLimit: -1, // Unlimited
        aiRequestsUsed: 0,
        storageUsedMb: 0,
        storageLimitMb: 999999,
      };

      return this.usageStats;
    } catch (error) {
      console.error('Error in getUsageStats:', error);
      return null;
    }
  }

  /**
   * Check if user can create a new voice memo
   */
  async canCreateVoiceMemo(): Promise<boolean> {
    // BYPASS: Always allow voice memo creation for Pro users
    return true;
  }

  /**
   * Track voice memo creation (increments usage)
   */
  async trackVoiceMemoCreation(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('increment_usage', {
        user_uuid: user.id,
        usage_type: 'voice_memo'
      });

      if (error) {
        // Check if it's a missing function error
        if (error.message?.includes('Could not find') || error.message?.includes('function')) {
          console.warn('⚠️ increment_usage function not found in database. Usage tracking disabled.');
          console.warn('💡 Run FIX_DATABASE_FUNCTION.sql to enable usage tracking.');
        } else {
          console.error('Error tracking voice memo creation:', error);
        }
      } else {
        // Invalidate cache to force refresh on next call
        this.usageStats = null;
      }
    } catch (error: any) {
      // Silently fail for missing function
      if (error.message?.includes('Could not find') || error.message?.includes('function')) {
        console.warn('⚠️ Usage tracking unavailable - database function missing');
      } else {
        console.error('Error in trackVoiceMemoCreation:', error);
      }
    }
  }

  /**
   * Track AI request (increments usage)
   */
  async trackAIRequest(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('increment_usage', {
        user_uuid: user.id,
        usage_type: 'ai_request'
      });

      if (error) {
        // Check if it's a missing function error
        if (error.message?.includes('Could not find') || error.message?.includes('function')) {
          console.warn('⚠️ increment_usage function not found in database. Usage tracking disabled.');
        } else {
          console.error('Error tracking AI request:', error);
        }
      } else {
        // Invalidate cache
        this.usageStats = null;
      }
    } catch (error: any) {
      // Silently fail for missing function
      if (error.message?.includes('Could not find') || error.message?.includes('function')) {
        console.warn('⚠️ Usage tracking unavailable - database function missing');
      } else {
        console.error('Error in trackAIRequest:', error);
      }
    }
  }

  /**
   * Get usage percentage (for progress bars)
   */
  async getUsagePercentage(): Promise<number> {
    const stats = await this.getUsageStats();
    if (!stats) return 0;

    if (stats.voiceMemosLimit === -1) return 0; // Unlimited
    if (stats.voiceMemosLimit === 0) return 100; // No limit set

    return Math.min(100, (stats.voiceMemosUsed / stats.voiceMemosLimit) * 100);
  }

  // ================================================
  // PLAN MANAGEMENT
  // ================================================

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
        return [];
      }

      return data.map((plan: any) => ({
        id: plan.id,
        planName: plan.plan_name,
        displayName: plan.display_name,
        description: plan.description,
        monthlyPriceInr: plan.monthly_price_inr,
        monthlyPriceUsd: plan.monthly_price_usd,
        yearlyPriceInr: plan.yearly_price_inr,
        yearlyPriceUsd: plan.yearly_price_usd,
        features: plan.features,
        isActive: plan.is_active,
        sortOrder: plan.sort_order,
      }));
    } catch (error) {
      console.error('Error in getAvailablePlans:', error);
      return [];
    }
  }

  /**
   * Upgrade to a paid plan
   */
  async upgradeToPlan(
    planType: 'premium' | 'pro' | 'enterprise',
    paymentId: string,
    paymentProvider: string = 'razorpay'
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const subscription = await this.getSubscription();
      if (!subscription) return false;

      // Update subscription
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          plan_type: planType,
          subscription_start_date: new Date().toISOString(),
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          payment_id: paymentId,
          payment_provider: paymentProvider,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error upgrading plan:', error);
        return false;
      }

      // Log payment transaction
      await this.logPaymentTransaction(subscription.id, planType, paymentId, paymentProvider);

      // Refresh subscription data
      await this.getSubscription(true);
      return true;
    } catch (error) {
      console.error('Error in upgradeToPlan:', error);
      return false;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const subscription = await this.getSubscription();
      if (!subscription) return false;

      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          auto_renew: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscription.id);

      if (error) {
        console.error('Error cancelling subscription:', error);
        return false;
      }

      // Refresh subscription
      await this.getSubscription(true);
      return true;
    } catch (error) {
      console.error('Error in cancelSubscription:', error);
      return false;
    }
  }

  // ================================================
  // TRIAL REMINDERS
  // ================================================

  /**
   * Check trial status and show appropriate reminders
   */
  async checkTrialReminders(): Promise<void> {
    const daysRemaining = await this.getTrialDaysRemaining();
    
    if (daysRemaining === 7) {
      console.log('🎯 Trial Reminder: 7 days remaining');
      // TODO: Show in-app notification or alert
    } else if (daysRemaining === 3) {
      console.log('⚠️ Trial Reminder: 3 days remaining - Time to upgrade!');
      // TODO: Show upgrade prompt
    } else if (daysRemaining === 1) {
      console.log('🚨 Trial Reminder: Last day of trial!');
      // TODO: Show urgent upgrade prompt
    } else if (daysRemaining === 0) {
      console.log('❌ Trial expired - Please subscribe to continue');
      // TODO: Show subscription required screen
    }
  }

  /**
   * Show upgrade prompt with appropriate message
   */
  showUpgradePrompt(featureName: string = 'this feature'): void {
    Alert.alert(
      '✨ Premium Feature',
      `${featureName} is available in Premium plans. Upgrade now to unlock all features!`,
      [
        { text: 'Not Now', style: 'cancel' },
        { 
          text: 'Upgrade', 
          onPress: () => {
            // TODO: Navigate to upgrade screen
            console.log('Navigate to upgrade screen');
          }
        }
      ]
    );
  }

  /**
   * Show limit reached alert
   */
  showLimitReachedAlert(limitType: string = 'voice memo'): void {
    Alert.alert(
      '🚫 Limit Reached',
      `You've reached your monthly ${limitType} limit. Upgrade to Premium for unlimited access!`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade Now', 
          onPress: () => {
            // TODO: Navigate to upgrade screen
            console.log('Navigate to upgrade screen');
          }
        }
      ]
    );
  }

  // ================================================
  // HELPER METHODS
  // ================================================

  /**
   * Log payment transaction
   */
  private async logPaymentTransaction(
    subscriptionId: string,
    planType: string,
    paymentId: string,
    paymentProvider: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get plan price
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('monthly_price_inr')
        .eq('plan_name', planType)
        .single();

      const amount = plan?.monthly_price_inr || 0;

      await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          subscription_id: subscriptionId,
          amount: amount,
          currency: 'INR',
          payment_provider: paymentProvider,
          payment_id: paymentId,
          payment_status: 'completed',
          payment_date: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging payment transaction:', error);
    }
  }

  /**
   * Cache subscription to AsyncStorage for offline access
   */
  private async cacheSubscription(subscription: Subscription): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'memovox_subscription',
        JSON.stringify(subscription)
      );
    } catch (error) {
      console.error('Error caching subscription:', error);
    }
  }

  /**
   * Get cached subscription (for offline mode)
   */
  async getCachedSubscription(): Promise<Subscription | null> {
    try {
      const cached = await AsyncStorage.getItem('memovox_subscription');
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached subscription:', error);
      return null;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.subscription = null;
    this.usageStats = null;
    this.cacheTimestamp = 0;
    await AsyncStorage.removeItem('memovox_subscription');
  }
}

// ================================================
// EXPORT SINGLETON INSTANCE
// ================================================

export default SubscriptionService.getInstance();
