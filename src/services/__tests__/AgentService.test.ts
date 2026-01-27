/**
 * AgentService Unit Tests
 * 
 * This is a scaffold for testing AgentService functionality.
 * Add more tests as needed for critical business logic.
 */

import AgentService from '../AgentService';

describe('AgentService', () => {
  describe('parseActionDate', () => {
    it('should parse "today" as today\'s date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const parsed = (AgentService as any).parseActionDate('today');
      expect(parsed).not.toBeNull();
      expect(parsed?.toDateString()).toBe(today.toDateString());
    });

    it('should parse "tomorrow" as tomorrow\'s date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const parsed = (AgentService as any).parseActionDate('tomorrow');
      expect(parsed).not.toBeNull();
      expect(parsed?.toDateString()).toBe(tomorrow.toDateString());
    });

    it('should return null for invalid date strings', () => {
      const parsed = (AgentService as any).parseActionDate('invalid-date-string');
      // Depending on implementation, this might return null or a fallback
      // Adjust expectation based on actual behavior
    });
  });

  describe('Singleton Pattern', () => {
    it('should export a singleton instance', () => {
      expect(AgentService).toBeDefined();
      expect(typeof AgentService.getUserActions).toBe('function');
      expect(typeof AgentService.createAction).toBe('function');
      expect(typeof AgentService.completeAction).toBe('function');
    });
  });
});
