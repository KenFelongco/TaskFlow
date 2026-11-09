import React, { useState, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  Image,
  LogBox,
} from 'react-native';

LogBox.ignoreAllLogs();
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Task, TaskStatus, Category, SyncMutation, TeamMember } from './src/types';
import { localDB } from './src/services/storage';
import { syncEngine } from './src/services/syncEngine';
import { socketService } from './src/services/socketService';
import { authService, UserProfile } from './src/services/authService';
import { Header } from './src/components/Header';
import { StatsCard } from './src/components/StatsCard';
import { FilterBar, FilterType } from './src/components/FilterBar';
import { TaskCard } from './src/components/TaskCard';
import { SyncQueueModal } from './src/components/SyncQueueModal';
import { RoomModal } from './src/components/RoomModal';
import { CreateRoomModal } from './src/components/CreateRoomModal';
import { JoinRoomModal } from './src/components/JoinRoomModal';
import { UserProfileModal } from './src/components/UserProfileModal';
import { BenchmarkPanel } from './src/components/BenchmarkPanel';
import { LoadingScreen } from './src/components/LoadingScreen';
import { BottomNavBar, BottomTabType } from './src/components/BottomNavBar';
import { AddTaskScreen } from './src/screens/AddTaskScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { API_URL } from './src/config/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
    },
  },
});

type AppScreen = 'home' | 'tasks' | 'add_task' | 'board' | 'benchmarks' | 'profile';

function toTeamMember(m: any): TeamMember {
  const name = m.displayName || m.name || m.email?.split('@')[0] || 'Team Member';
  const initials =
    name
      .split(' ')
      .map((n: string) => n[0])
      .filter(Boolean)
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'TM';
  const palette = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6'];
  const charCode = name.charCodeAt(0) || 0;
  const avatar = palette[charCode % palette.length];

  return {
    id: m.userId || m.id || `tm_${Math.random()}`,
    name,
    role: m.role || 'Member',
    avatar,
    avatarUrl:
      m.avatarUrl ||
      `https://images.unsplash.com/photo-${1535713875000 + (charCode % 1000)}?auto=format&fit=crop&w=160&q=80`,
    initials,
  };
}

function MainTaskFlowApp() {
  const [showLoadingIntro, setShowLoadingIntro] = useState(true);
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(authService.user);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const initialLocalRooms = localDB.getRooms();
  const initialActiveCode = localDB.getActiveRoomCode() || (initialLocalRooms[0]?.inviteCode || '');
  const initialActiveRoom = initialLocalRooms.find((r) => r.inviteCode === initialActiveCode);

  const [currentRoomCode, setCurrentRoomCode] = useState<string>(initialActiveCode);
  const [currentRoomName, setCurrentRoomName] = useState<string>(initialActiveRoom?.name || 'My Workspace');
  const [myRooms, setMyRooms] = useState<Array<{ id: string; name: string; inviteCode: string; role?: string }>>(initialLocalRooms);
  const [onlineMembers, setOnlineMembers] = useState<TeamMember[]>([]);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mutations, setMutations] = useState<SyncMutation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(syncEngine.status);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(syncEngine.simulatedOffline);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fcmAlert, setFcmAlert] = useState<{ title: string; body: string } | null>(null);

  const refreshLocalState = () => {
    setTasks(localDB.getTasks());
    setCategories(localDB.getCategories());
    setMutations(localDB.getMutations());
    setNetworkStatus(syncEngine.status);
    setIsSimulatedOffline(syncEngine.simulatedOffline);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchMyRooms = async (targetCode?: string) => {
    let localRooms = localDB.getRooms();
    const storedActiveCode = targetCode || localDB.getActiveRoomCode() || currentRoomCode;

    try {
      const token = authService.authToken;
      const res = await fetch(`${API_URL}/rooms/my-rooms`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(currentUser
            ? {
                'x-dev-user-id': currentUser.id,
                'x-dev-user-name': currentUser.displayName,
                'x-dev-user-email': currentUser.email,
              }
            : { 'x-dev-user-id': 'guest' }),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms && Array.isArray(data.rooms)) {
          // Merge server rooms with locally cached rooms without duplicating
          const mergedMap = new Map<string, any>();
          localRooms.forEach((r) => mergedMap.set(r.inviteCode, r));
          data.rooms.forEach((r: any) => mergedMap.set(r.inviteCode, r));
          const merged = Array.from(mergedMap.values());

          if (merged.length > 0) {
            setMyRooms(merged);
            localDB.saveRooms(merged);

            // Determine active room: prefer targetCode, then storedActiveCode, then existing currentRoomCode, then first room
            const activeCode =
              targetCode ||
              (storedActiveCode && merged.some((r) => r.inviteCode === storedActiveCode) ? storedActiveCode : '') ||
              (currentRoomCode && merged.some((r) => r.inviteCode === currentRoomCode) ? currentRoomCode : '') ||
              merged[0].inviteCode;

            const activeRoom = merged.find((r) => r.inviteCode === activeCode) || merged[0];
            setCurrentRoomCode(activeCode);
            setCurrentRoomName(activeRoom.name);
            localDB.saveActiveRoomCode(activeCode);

            if (currentUser) {
              socketService.joinRoom(activeCode, {
                id: currentUser.id,
                name: currentUser.displayName,
                role: currentUser.role || 'Room Creator',
                avatarUrl: currentUser.avatarUrl,
              });
            }
            fetchRoomMembers(activeCode);
            fetchRoomTasks(activeCode);
            return;
          }
        }
      }
    } catch (e) {
      // Backend offline fallback - continue safely with local rooms
    }

    // Offline / Local storage fallback:
    if (localRooms.length > 0) {
      setMyRooms(localRooms);
      const activeCode =
        targetCode ||
        (storedActiveCode && localRooms.some((r) => r.inviteCode === storedActiveCode) ? storedActiveCode : '') ||
        (currentRoomCode && localRooms.some((r) => r.inviteCode === currentRoomCode) ? currentRoomCode : '') ||
        localRooms[0].inviteCode;
      const activeRoom = localRooms.find((r) => r.inviteCode === activeCode) || localRooms[0];
      setCurrentRoomCode(activeCode);
      setCurrentRoomName(activeRoom.name);
      localDB.saveActiveRoomCode(activeCode);
      fetchRoomMembers(activeCode);
      fetchRoomTasks(activeCode);
      return;
    }

    // Default room creation when no rooms exist anywhere:
    const defaultCode = 'TF-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const defaultName = `${currentUser?.displayName || 'My'}'s Workspace`;
    const defaultRoom = {
      id: 'room_def_' + Date.now(),
      name: defaultName,
      inviteCode: defaultCode,
      role: 'OWNER',
    };
    const defaultList = [defaultRoom];
    setMyRooms(defaultList);
    localDB.saveRooms(defaultList);
    setCurrentRoomCode(defaultCode);
    setCurrentRoomName(defaultName);
    localDB.saveActiveRoomCode(defaultCode);

    // If online, also register with server
    if (currentUser) {
      try {
        const token = authService.authToken;
        const res = await fetch(`${API_URL}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-dev-user-id': currentUser.id,
            'x-dev-user-name': currentUser.displayName,
            'x-dev-user-email': currentUser.email,
          },
          body: JSON.stringify({ name: defaultName, inviteCode: defaultCode }),
        });
        if (res.ok) {
          const data = await res.json();
          const serverCode = data.inviteCode || data.room?.inviteCode || defaultCode;
          const serverRoom = {
            id: data.room?.id || defaultRoom.id,
            name: data.room?.name || defaultName,
            inviteCode: serverCode,
            role: 'OWNER',
          };
          setMyRooms([serverRoom]);
          localDB.saveRooms([serverRoom]);
          setCurrentRoomCode(serverCode);
          setCurrentRoomName(serverRoom.name);
          localDB.saveActiveRoomCode(serverCode);
        }
      } catch {}
    }
  };

  useEffect(() => {
    const unsubAuth = authService.subscribe((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubAuth();
    };
  }, []);

  const fetchRoomMembers = async (roomCode: string) => {
    try {
      const token = authService.authToken;
      const res = await fetch(`${API_URL}/rooms/${roomCode}/members`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members && Array.isArray(data.members) && data.members.length > 0) {
          setOnlineMembers(data.members.map(toTeamMember));
          return;
        }
      }
    } catch (e) {
      // offline fallback
    }
    if (currentUser) {
      setOnlineMembers([
        {
          id: currentUser.id,
          name: currentUser.displayName || 'You',
          role: currentUser.role || 'Room Creator',
          avatar: '#6366F1',
          avatarUrl: currentUser.avatarUrl || '',
          initials: (currentUser.displayName || 'ME').substring(0, 2).toUpperCase(),
        },
      ]);
    } else {
      setOnlineMembers([]);
    }
  };

  const fetchRoomTasks = async (roomCode: string) => {
    if (!roomCode) return;
    try {
      const token = authService.authToken;
      const res = await fetch(`${API_URL}/rooms/${roomCode}/tasks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks && Array.isArray(data.tasks)) {
          const currentTasks = localDB.getTasks();
          const taskMap = new Map<string, Task>();
          currentTasks.forEach((t) => taskMap.set(t.id, t));
          data.tasks.forEach((t: Task) => {
            const existing = taskMap.get(t.id);
            taskMap.set(t.id, { ...(existing || {}), ...t, roomCode });
          });
          const merged = Array.from(taskMap.values());
          localDB.saveTasks(merged);
          localDB.saveRoomTasks(roomCode, data.tasks);
          refreshLocalState();
          return;
        }
      }
    } catch (e) {
      // offline fallback
    }

    const offlineRoomTasks = localDB.getRoomTasks(roomCode);
    if (offlineRoomTasks.length > 0) {
      const currentTasks = localDB.getTasks();
      const taskMap = new Map<string, Task>();
      currentTasks.forEach((t) => taskMap.set(t.id, t));
      offlineRoomTasks.forEach((t) => taskMap.set(t.id, t));
      const merged = Array.from(taskMap.values());
      localDB.saveTasks(merged);
      refreshLocalState();
    }
  };

  useEffect(() => {
    // 1. Scope storage to current user (or guest)
    localDB.setUserScope(currentUser?.id || null);
    refreshLocalState();

    // 2. Load isolated rooms and active room for this user
    const scopedRooms = localDB.getRooms();
    const storedActive = localDB.getActiveRoomCode();
    const activeCode = storedActive || (scopedRooms[0]?.inviteCode || '');
    const activeRoom = scopedRooms.find((r) => r.inviteCode === activeCode) || scopedRooms[0];

    setMyRooms(scopedRooms);
    setCurrentRoomCode(activeCode);
    setCurrentRoomName(
      activeRoom?.name || (currentUser ? `${currentUser.displayName.split(' ')[0]}'s Workspace` : 'My Workspace')
    );

    // 3. Query server rooms and room members
    fetchMyRooms(activeCode);
    if (activeCode) {
      fetchRoomMembers(activeCode);
      fetchRoomTasks(activeCode);
    } else {
      setOnlineMembers(
        currentUser
          ? [
              {
                id: currentUser.id,
                name: currentUser.displayName,
                role: currentUser.role || 'Room Creator',
                avatar: '#6366F1',
                avatarUrl: currentUser.avatarUrl || '',
                initials: (currentUser.displayName || 'ME').substring(0, 2).toUpperCase(),
              },
            ]
          : []
      );
    }

    const unsubSync = syncEngine.subscribe(() => {
      refreshLocalState();
    });

    const activeUserId = currentUser?.id || 'guest';
    socketService.disconnect();
    socketService.connect(activeUserId, {
      id: activeUserId,
      name: currentUser?.displayName || 'Guest User',
      role: currentUser?.role || 'Lead Engineer',
      avatarUrl:
        currentUser?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80',
    });

    if (activeCode) {
      socketService.joinRoom(activeCode, {
        id: activeUserId,
        name: currentUser?.displayName || 'Guest User',
        role: currentUser?.role || 'Lead Engineer',
        avatarUrl: currentUser?.avatarUrl,
      });
    }

    // Listen to live Room Code collaboration events
    const unsubRoomMembers = socketService.on('room:members_updated', (data) => {
      if (data.members && Array.isArray(data.members)) {
        setOnlineMembers(data.members.map(toTeamMember));
      }
      if (data.joinedUser && data.joinedUser.name !== (currentUser?.displayName || 'You')) {
        showToast(`🟢 ${data.joinedUser.name} joined Room [${data.roomCode}]`);
      }
    });

    const unsubRoomTaskCreated = socketService.on('room:task_created', (newTask) => {
      showToast(`⚡ New Task from Team: "${newTask.title}"`);
      const currentTasks = localDB.getTasks();
      if (!currentTasks.some((t) => t.id === newTask.id)) {
        currentTasks.unshift(newTask);
        localDB.saveTasks(currentTasks);
        if (newTask.roomCode) {
          const roomTasks = localDB.getRoomTasks(newTask.roomCode);
          if (!roomTasks.some((t) => t.id === newTask.id)) {
            roomTasks.unshift(newTask);
            localDB.saveRoomTasks(newTask.roomCode, roomTasks);
          }
        }
        refreshLocalState();
      }
    });

    const unsubRoomTaskUpdated = socketService.on('room:task_updated', (updatedTask) => {
      showToast(`⚡ Team Task Updated: "${updatedTask.title}"`);
      const currentTasks = localDB.getTasks();
      const idx = currentTasks.findIndex((t) => t.id === updatedTask.id);
      if (idx !== -1) {
        currentTasks[idx] = updatedTask;
        localDB.saveTasks(currentTasks);
        if (updatedTask.roomCode) {
          const roomTasks = localDB.getRoomTasks(updatedTask.roomCode);
          const rIdx = roomTasks.findIndex((t) => t.id === updatedTask.id);
          if (rIdx !== -1) roomTasks[rIdx] = updatedTask;
          else roomTasks.unshift(updatedTask);
          localDB.saveRoomTasks(updatedTask.roomCode, roomTasks);
        }
        refreshLocalState();
      }
    });

    const unsubRoomTaskDeleted = socketService.on('room:task_deleted', (data) => {
      showToast(`🗑️ Task deleted by teammate`);
      const currentTasks = localDB.getTasks().filter((t) => t.id !== data.id);
      localDB.saveTasks(currentTasks);
      if (currentRoomCode) {
        const roomTasks = localDB.getRoomTasks(currentRoomCode).filter((t) => t.id !== data.id);
        localDB.saveRoomTasks(currentRoomCode, roomTasks);
      }
      refreshLocalState();
    });

    const unsubReminder = socketService.on('reminder:triggered', (data) => {
      showToast(`⏰ REMINDER: "${data.title}" is due!`);
    });

    const unsubFcm = socketService.on('fcm:notification', (data) => {
      setFcmAlert({ title: data.title, body: data.body });
      setTimeout(() => setFcmAlert(null), 6000);
    });

    syncEngine.runSync();

    return () => {
      unsubSync();
      unsubRoomMembers();
      unsubRoomTaskCreated();
      unsubRoomTaskUpdated();
      unsubRoomTaskDeleted();
      unsubReminder();
      unsubFcm();
      socketService.disconnect();
    };
  }, [currentUser]);

  const handleJoinDifferentRoom = (newCode: string, newName?: string) => {
    const formatted = newCode.trim().toUpperCase();
    setCurrentRoomCode(formatted);
    localDB.saveActiveRoomCode(formatted);
    if (newName) {
      setCurrentRoomName(newName);
    } else {
      const match = myRooms.find((r) => r.inviteCode === formatted);
      if (match) setCurrentRoomName(match.name);
    }

    if (currentUser) {
      socketService.joinRoom(formatted, {
        id: currentUser.id,
        name: currentUser.displayName,
        role: currentUser.role || 'Engineer',
        avatarUrl: currentUser.avatarUrl,
      });
    }
    showToast(`Entered Private Room [${formatted}]`);
    fetchMyRooms(formatted);
    fetchRoomMembers(formatted);
    fetchRoomTasks(formatted);
  };

  // Filter tasks based on current private room code, search, status, and team member
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Strict Room Isolation: Only show tasks belonging to this private room
      const currentCodeNorm = (currentRoomCode || '').trim().toUpperCase();
      const taskCodeNorm = (t.roomCode || '').trim().toUpperCase();
      if (taskCodeNorm) {
        if (taskCodeNorm !== currentCodeNorm) return false;
      } else {
        const defaultRoomCode = (myRooms[0]?.inviteCode || '').trim().toUpperCase();
        if (currentCodeNorm !== defaultRoomCode) return false;
      }

      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesCat = t.categoryName?.toLowerCase().includes(q);
        const matchesAssignee = t.assignee?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesCat && !matchesAssignee) return false;
      }

      if (activeFilter === 'today') {
        if (!t.dueDate) return false;
        const d = new Date(t.dueDate);
        const now = new Date();
        const isToday =
          d.getDate() === now.getDate() &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (activeFilter === 'urgent') {
        if (t.priority !== 'URGENT' && t.priority !== 'HIGH') return false;
      } else if (activeFilter === 'completed') {
        if (!t.isCompleted) return false;
      }

      if (selectedCategory && t.categoryId !== selectedCategory) return false;
      if (selectedMember && t.assignee !== selectedMember) return false;

      // Status Column Filter for Team Board View (Trello style)
      if (currentScreen === 'board' && selectedStatus !== 'ALL') {
        const tStatus = t.status || (t.isCompleted ? 'COMPLETED' : 'TODO');
        if (tStatus !== selectedStatus) return false;
      }

      return true;
    });
  }, [tasks, currentRoomCode, searchQuery, activeFilter, selectedCategory, selectedMember, selectedStatus, currentScreen]);

  const stats = useMemo(() => {
    const roomTasks = tasks.filter((t) => (t.roomCode || currentRoomCode) === currentRoomCode);
    const total = roomTasks.length;
    const completed = roomTasks.filter((t) => t.isCompleted).length;
    const pending = total - completed;
    const urgent = roomTasks.filter((t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && !t.isCompleted).length;
    return { total, completed, pending, urgent };
  }, [tasks, currentRoomCode]);

  const boardStatusCounts = useMemo(() => {
    const base = tasks.filter((t) => {
      const c = (currentRoomCode || '').trim().toUpperCase();
      const tc = (t.roomCode || '').trim().toUpperCase();
      if (tc && tc !== c) return false;
      if (selectedMember && t.assignee !== selectedMember) return false;
      return true;
    });
    return {
      all: base.length,
      todo: base.filter((t) => (t.status || 'TODO') === 'TODO' && !t.isCompleted).length,
      inProgress: base.filter((t) => t.status === 'IN_PROGRESS' && !t.isCompleted).length,
      completed: base.filter((t) => t.status === 'COMPLETED' || t.isCompleted).length,
    };
  }, [tasks, currentRoomCode, selectedMember]);

  const handleToggleOffline = () => {
    const isNowOffline = syncEngine.toggleSimulatedOffline();
    showToast(isNowOffline ? 'Switched to Simulated Offline Mode' : 'Online! Replaying offline mutation queue...');
  };

  const handleSyncPress = async () => {
    showToast('Syncing with PostgreSQL...');
    const result = await syncEngine.runSync();
    if (result.success) {
      showToast(`Synced successfully! (${result.syncedCount} changes pushed)`);
    } else {
      showToast('Offline or backend unavailable. Changes remain safely cached locally.');
    }
  };

  const handleSaveTask = async (taskData: any) => {
    const dataWithRoom = {
      ...taskData,
      roomCode: currentRoomCode,
    };
    let saved: any = null;
    if (editingTask) {
      saved = await syncEngine.updateTask(editingTask.id, dataWithRoom);
      showToast('Task updated and broadcast to team.');
      setEditingTask(null);
    } else {
      saved = await syncEngine.createTask(dataWithRoom);
      showToast(`Task created in Room [${currentRoomCode}]`);
    }

    if (saved && currentRoomCode) {
      const roomTasks = localDB.getRoomTasks(currentRoomCode);
      const idx = roomTasks.findIndex((t) => t.id === saved.id);
      if (idx !== -1) roomTasks[idx] = saved;
      else roomTasks.unshift(saved);
      localDB.saveRoomTasks(currentRoomCode, roomTasks);

      // Persist to server room store
      try {
        const token = authService.authToken;
        fetch(`${API_URL}/rooms/${currentRoomCode}/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(saved),
        }).catch(() => {});
      } catch {}
    }
    refreshLocalState();
    setCurrentScreen('home');
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const isCompleted = newStatus === 'COMPLETED';
    const updated = await syncEngine.updateTask(taskId, { status: newStatus, isCompleted });
    if (updated && currentRoomCode) {
      const roomTasks = localDB.getRoomTasks(currentRoomCode);
      const idx = roomTasks.findIndex((t) => t.id === taskId);
      if (idx !== -1) roomTasks[idx] = updated;
      localDB.saveRoomTasks(currentRoomCode, roomTasks);
    }
    showToast(`Task moved to ${newStatus.replace('_', ' ')}`);
  };

  const handleToggleComplete = async (id: string) => {
    await syncEngine.toggleComplete(id);
  };

  const handleDeleteTask = async (id: string) => {
    await syncEngine.deleteTask(id);
    showToast('Task deleted.');
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );

    await syncEngine.updateTask(taskId, { subtasks: updatedSubtasks });
  };

  const handleBottomTabChange = (tab: BottomTabType) => {
    if (tab === 'home') setCurrentScreen('home');
    else if (tab === 'tasks') setCurrentScreen('tasks');
    else if (tab === 'board') setCurrentScreen('board');
    else if (tab === 'profile') setCurrentScreen('profile');
  };

  const getActiveBottomTab = (): BottomTabType => {
    if (currentScreen === 'home') return 'home';
    if (currentScreen === 'tasks') return 'tasks';
    if (currentScreen === 'board') return 'board';
    if (currentScreen === 'profile') return 'profile';
    return 'home';
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsProfileModalOpen(false);
    setIsRoomModalOpen(false);
    socketService.disconnect();
    setCurrentRoomCode('');
    setCurrentRoomName('My Workspace');
    setMyRooms([]);
    setOnlineMembers([]);
    showToast('Logged out of TaskFlow.');
  };

  // 1. Authentication Screen
  if (!currentUser || isAuthOpen) {
    return (
      <View style={styles.rootContainer}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: '#1E1B4B' }]}>
          <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
          <AuthScreen
            onSuccess={(user) => {
              setCurrentUser(user);
              setIsAuthOpen(false);
              showToast(`Signed in as ${user.displayName}`);
            }}
            onCancel={currentUser ? () => setIsAuthOpen(false) : undefined}
          />
        </SafeAreaView>
        {showLoadingIntro && (
          <LoadingScreen onFinish={() => setShowLoadingIntro(false)} />
        )}
      </View>
    );
  }

  if (currentScreen === 'add_task') {
    return (
      <View style={styles.rootContainer}>
        <AddTaskScreen
          onBack={() => {
            setEditingTask(null);
            setCurrentScreen('home');
          }}
          onSave={handleSaveTask}
          editingTask={editingTask}
          categories={categories}
          teamMembers={onlineMembers}
          currentRoomCode={currentRoomCode}
          currentUser={currentUser}
        />
        {showLoadingIntro && (
          <LoadingScreen onFinish={() => setShowLoadingIntro(false)} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#2A246B" />


      <View style={styles.appContainer}>
        {/* Toast Notification */}
        {toastMessage && (
          <View style={styles.toastContainer}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* FCM Urgent Push Alert Banner */}
        {fcmAlert && (
          <View style={styles.fcmBanner}>
            <View style={styles.fcmHeaderRow}>
              <Text style={styles.fcmBadge}>📢 FIREBASE CLOUD MESSAGING</Text>
              <TouchableOpacity onPress={() => setFcmAlert(null)}>
                <Text style={styles.fcmClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fcmTitle}>{fcmAlert.title}</Text>
            <Text style={styles.fcmBody}>{fcmAlert.body}</Text>
          </View>
        )}

        {/* Screen Content */}
        {currentScreen === 'profile' ? (
          /* Dedicated Profile Screen */
          <View style={styles.flexOne}>
            <ProfileScreen
              currentUser={currentUser}
              currentRoomCode={currentRoomCode}
              currentRoomName={currentRoomName}
              myRooms={myRooms}
              onlineMemberCount={onlineMembers.length}
              networkStatus={networkStatus}
              isSimulatedOffline={isSimulatedOffline}
              totalTasksCount={tasks.length}
              completedTasksCount={tasks.filter((t) => t.isCompleted).length}
              onBack={() => setCurrentScreen('home')}
              onOpenRoomModal={() => setIsRoomModalOpen(true)}
              onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
              onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
              onOpenBenchmarks={() => setCurrentScreen('benchmarks')}
              onToggleOffline={handleToggleOffline}
              onLogout={handleLogout}
            />
          </View>
        ) : currentScreen === 'benchmarks' ? (
          /* Standalone Benchmark View */
          <View style={styles.flexOne}>
            <View style={styles.benchmarkHeaderBar}>
              <TouchableOpacity
                style={styles.circleBackBtn}
                onPress={() => setCurrentScreen('profile')}
                activeOpacity={0.7}
              >
                <Text style={styles.circleBackArrow}>←</Text>
              </TouchableOpacity>
              <Text style={styles.benchmarkHeaderTitle}>Engine Benchmarks</Text>
              <View style={{ width: 38 }} />
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
              <BenchmarkPanel metrics={syncEngine.benchmarkMetrics} onRefresh={refreshLocalState} />
            </ScrollView>
          </View>
        ) : (
          /* Unified App Screen (Home, Tasks, Board) */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Unified Top Brand Header */}
            <Header
              networkStatus={networkStatus}
              isSimulatedOffline={isSimulatedOffline}
              pendingMutationCount={mutations.length}
              currentRoomCode={currentRoomCode}
              currentRoomName={currentRoomName}
              currentUser={currentUser}
              onlineMemberCount={onlineMembers.length}
              onOpenRoomModal={() => setIsRoomModalOpen(true)}
              onToggleOffline={handleToggleOffline}
              onSyncPress={handleSyncPress}
              onOpenQueue={() => setIsQueueModalOpen(true)}
              onAddTaskPress={() => {
                setEditingTask(null);
                setCurrentScreen('add_task');
              }}
              onOpenProfileModal={() => setCurrentScreen('profile')}
            />

            {currentScreen === 'board' ? (
              /* ==================================================== */
              /* TAB: Team Board View                                 */
              /* ==================================================== */
              <View style={styles.teamContainer}>
                <View style={styles.teamHeader}>
                  <View style={styles.teamHeaderTop}>
                    <Text style={styles.teamTitle}>Team Room: {currentRoomCode}</Text>
                    <TouchableOpacity
                      style={styles.roomSwitchBtn}
                      onPress={() => setIsRoomModalOpen(true)}
                    >
                      <Text style={styles.roomSwitchText}>Room Settings</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.teamSub}>
                    Live collaboration: {onlineMembers.length} active members connected
                  </Text>
                </View>

                {/* Team Members Chips with Real Photos */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
                  <TouchableOpacity
                    style={[styles.memberChip, selectedMember === null && styles.memberChipActive]}
                    onPress={() => setSelectedMember(null)}
                  >
                    <Text style={[styles.memberChipText, selectedMember === null && styles.memberChipTextActive]}>
                      All Members ({tasks.length})
                    </Text>
                  </TouchableOpacity>

                  {onlineMembers.map((tm) => {
                    const isSelected = selectedMember === tm.name;
                    const memberCount = tasks.filter((t) => t.assignee === tm.name).length;
                    return (
                      <TouchableOpacity
                        key={tm.id}
                        style={[styles.memberChip, isSelected && { backgroundColor: '#5B4FC425', borderColor: '#5B4FC4' }]}
                        onPress={() => setSelectedMember(isSelected ? null : tm.name)}
                      >
                        <Image source={{ uri: tm.avatarUrl }} style={styles.memberAvatarPhoto} />
                        <Text style={[styles.memberChipText, isSelected && { color: '#5B4FC4', fontWeight: '700' }]}>
                          {tm.name} ({memberCount})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Trello Kanban Status Column Switcher */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanbanScroll}>
                  {[
                    { key: 'ALL', label: `All (${boardStatusCounts.all})` },
                    { key: 'TODO', label: `📋 To Do (${boardStatusCounts.todo})` },
                    { key: 'IN_PROGRESS', label: `⏳ In Progress (${boardStatusCounts.inProgress})` },
                    { key: 'COMPLETED', label: `✅ Done (${boardStatusCounts.completed})` },
                  ].map((st) => {
                    const isSelected = selectedStatus === st.key;
                    return (
                      <TouchableOpacity
                        key={st.key}
                        style={[styles.kanbanChip, isSelected && styles.kanbanChipActive]}
                        onPress={() => setSelectedStatus(st.key as any)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.kanbanChipText, isSelected && styles.kanbanChipTextActive]}>
                          {st.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {selectedMember ? `Tasks for ${selectedMember}` : 'Team Tasks'}
                  </Text>
                  <Text style={styles.taskCountBadge}>{filteredTasks.length} tasks</Text>
                </View>

                {filteredTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onEditPress={(t) => {
                      setEditingTask(t);
                      setCurrentScreen('add_task');
                    }}
                    onDeletePress={handleDeleteTask}
                    onToggleSubtask={handleToggleSubtask}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </View>
            ) : currentScreen === 'tasks' ? (
              /* ==================================================== */
              /* TAB: All Tasks Screen (Harmonized Consistent Design) */
              /* ==================================================== */
              <View>
                {/* Search & Filter Bar */}
                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                />

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>All Workspace Tasks</Text>
                  <Text style={styles.taskCountBadge}>{filteredTasks.length} tasks</Text>
                </View>

                {filteredTasks.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>📝</Text>
                    <Text style={styles.emptyTitle}>No Tasks Found</Text>
                    <Text style={styles.emptySubtitle}>
                      {searchQuery
                        ? 'No tasks matched your search query.'
                        : 'Tap "＋" in the bottom bar to create a task for this room.'}
                    </Text>
                  </View>
                ) : (
                  <>
                    {filteredTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onEditPress={(t) => {
                          setEditingTask(t);
                          setCurrentScreen('add_task');
                        }}
                        onDeletePress={handleDeleteTask}
                        onToggleSubtask={handleToggleSubtask}
                        onStatusChange={handleStatusChange}
                        showChevron={true}
                      />
                    ))}

                    {/* Bottom "All Caught Up" Card */}
                    <View style={styles.caughtUpCard}>
                      <View style={styles.caughtUpIconBox}>
                        <Text style={styles.caughtUpIcon}>📝</Text>
                        <View style={styles.caughtUpCheckBadge}>
                          <Text style={styles.caughtUpCheckmark}>✓</Text>
                        </View>
                      </View>
                      <Text style={styles.caughtUpTitle}>All caught up!</Text>
                      <Text style={styles.caughtUpSubtitle}>
                        You're doing great. No more pending tasks.
                      </Text>
                    </View>
                  </>
                )}
              </View>
            ) : (
              /* ==================================================== */
              /* TAB: Home Overview Screen                            */
              /* ==================================================== */
              <View>
                {/* Productivity Overview Card */}
                <StatsCard
                  total={stats.total}
                  pending={stats.pending}
                  completed={stats.completed}
                  urgent={stats.urgent}
                />

                {/* Search & Filter Bar */}
                <FilterBar
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                />

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Active Tasks</Text>
                  <Text style={styles.taskCountBadge}>{filteredTasks.length} tasks</Text>
                </View>

                {filteredTasks.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyIcon}>🎉</Text>
                    <Text style={styles.emptyTitle}>No Tasks Found</Text>
                    <Text style={styles.emptySubtitle}>
                      {searchQuery
                        ? 'No tasks matched your search query.'
                        : 'Tap "＋" in the bottom bar to create your first task.'}
                    </Text>
                  </View>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onEditPress={(t) => {
                        setEditingTask(t);
                        setCurrentScreen('add_task');
                      }}
                      onDeletePress={handleDeleteTask}
                      onToggleSubtask={handleToggleSubtask}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Floating Bottom Navigation Bar */}
        <BottomNavBar
          activeTab={getActiveBottomTab()}
          onTabChange={handleBottomTabChange}
          onAddTaskPress={() => {
            setEditingTask(null);
            setCurrentScreen('add_task');
          }}
        />
      </View>

      {/* Private Room Collaboration Modal */}
      <RoomModal
        visible={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        currentRoomCode={currentRoomCode}
        currentRoomName={currentRoomName}
        myRooms={myRooms}
        onlineMembers={onlineMembers}
        onSelectRoom={(code, name) => handleJoinDifferentRoom(code, name)}
        onOpenCreateRoom={() => setIsCreateRoomOpen(true)}
        onOpenJoinRoom={() => setIsJoinRoomOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {/* Account Profile Modal with Log Out */}
      <UserProfileModal
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        currentRoomCode={currentRoomCode}
        currentRoomName={currentRoomName}
        myRooms={myRooms}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setIsProfileModalOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Create Room Modal */}
      <CreateRoomModal
        visible={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onRoomCreated={(room) => {
          const updated = [...myRooms.filter((r) => r.inviteCode !== room.inviteCode), { ...room, role: 'OWNER' }];
          setMyRooms(updated);
          localDB.saveRooms(updated);
          handleJoinDifferentRoom(room.inviteCode, room.name);
          setIsRoomModalOpen(false);
          setCurrentScreen('home');
          showToast(`Created & joined private room: ${room.name}`);
        }}
      />

      {/* Join Room Modal */}
      <JoinRoomModal
        visible={isJoinRoomOpen}
        onClose={() => setIsJoinRoomOpen(false)}
        onRoomJoined={(room) => {
          const updated = [...myRooms.filter((r) => r.inviteCode !== room.inviteCode), { ...room, role: 'MEMBER' }];
          setMyRooms(updated);
          localDB.saveRooms(updated);
          if (room.members && room.members.length > 0) {
            setOnlineMembers(room.members);
          }
          handleJoinDifferentRoom(room.inviteCode, room.name);
          setIsRoomModalOpen(false);
          setCurrentScreen('home');
          showToast(`Entered private room: ${room.name}`);
        }}
      />

      {/* Sync Queue Inspector Modal */}
      <SyncQueueModal
        visible={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        mutations={mutations}
        onSyncNow={handleSyncPress}
        onClearQueue={() => {
          localDB.saveMutations([]);
          refreshLocalState();
          showToast('Local mutation queue cleared.');
        }}
      />
    </SafeAreaView>
    {showLoadingIntro && (
      <LoadingScreen onFinish={() => setShowLoadingIntro(false)} />
    )}
  </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainTaskFlowApp />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#050811',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#2A246B',
  },
  appContainer: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#F2F5FC',
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F2F5FC',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  benchmarkHeaderBar: {
    backgroundColor: '#2A246B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 12,
  },
  benchmarkHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  circleBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackArrow: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  taskCountBadge: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  caughtUpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  caughtUpIconBox: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  caughtUpIcon: {
    fontSize: 28,
  },
  caughtUpCheckBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  caughtUpCheckmark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  caughtUpTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  caughtUpSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  teamContainer: {
    marginTop: 8,
  },
  teamHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  teamHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  roomSwitchBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  roomSwitchText: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  teamSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  membersScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 10,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  memberChipActive: {
    backgroundColor: '#5B4FC4',
    borderColor: '#5B4FC4',
  },
  memberAvatarPhoto: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  memberChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  memberChipTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  kanbanScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingTop: 4,
    paddingBottom: 10,
  },
  kanbanChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kanbanChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  kanbanChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  kanbanChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 280,
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  fcmBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#78350F',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  fcmHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  fcmBadge: {
    color: '#FDE68A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  fcmClose: {
    color: '#FDE68A',
    fontSize: 14,
    padding: 2,
  },
  fcmTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fcmBody: {
    color: '#FEF3C7',
    fontSize: 12,
  },
});
