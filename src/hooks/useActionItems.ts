// src/hooks/useActionItems.ts

import { useState, useEffect } from 'react';
import AgentActionManager, { ActionItem } from '../services/AgentActionManager';

export function useActionItems() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [pendingActions, setPendingActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActions: 0,
    pendingActions: 0,
    completedActions: 0,
    highPriorityCount: 0,
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [allActions, actionStats] = await Promise.all([
          AgentActionManager.getAllActionItems(),
          AgentActionManager.getActionStats(),
        ]);

        setActions(allActions);
        setPendingActions(allActions.filter((a) => a.status === 'pending'));
        setStats(actionStats);
      } catch (error) {
        console.error('Error loading action items:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // Subscribe to updates
    const unsubscribe = AgentActionManager.subscribeToActions((updated) => {
      setActions(updated);
      setPendingActions(updated.filter((a) => a.status === 'pending'));
    });

    return () => unsubscribe();
  }, []);

  return {
    actions,
    pendingActions,
    loading,
    stats,
    completeAction: AgentActionManager.completeAction.bind(AgentActionManager),
    cancelAction: AgentActionManager.cancelAction.bind(AgentActionManager),
    deleteAction: AgentActionManager.deleteAction.bind(AgentActionManager),
  };
}

export default useActionItems;
