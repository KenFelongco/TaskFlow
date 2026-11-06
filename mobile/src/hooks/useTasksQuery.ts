import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '../types';
import { localDB } from '../services/storage';
import { syncEngine } from '../services/syncEngine';

export const TASKS_QUERY_KEY = ['tasks'];

export function useTasksQuery() {
  return useQuery<Task[]>({
    queryKey: TASKS_QUERY_KEY,
    queryFn: async () => {
      return localDB.getTasks();
    },
    staleTime: 1000 * 5,
  });
}

export function useTaskMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'logicalTimestamp'>) => {
      return syncEngine.createTask(taskData);
    },
    onMutate: async (newTaskData) => {
      // Optimistic update directly in React Query cache
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      const optimisticTask: Task = {
        ...newTaskData,
        id: 'optimistic_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        logicalTimestamp: 999,
        isPendingSync: true,
      };
      queryClient.setQueryData<Task[]>(TASKS_QUERY_KEY, [optimisticTask, ...previousTasks]);
      return { previousTasks };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return syncEngine.updateTask(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      queryClient.setQueryData<Task[]>(
        TASKS_QUERY_KEY,
        previousTasks.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      return { previousTasks };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return syncEngine.deleteTask(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TASKS_QUERY_KEY });
      const previousTasks = queryClient.getQueryData<Task[]>(TASKS_QUERY_KEY) || [];
      queryClient.setQueryData<Task[]>(
        TASKS_QUERY_KEY,
        previousTasks.filter((t) => t.id !== id)
      );
      return { previousTasks };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });

  return {
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
  };
}
