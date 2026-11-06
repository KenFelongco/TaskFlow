import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { colors } from '../theme/colors';
import { Task, Priority, Category, TeamMember } from '../types';

interface AddTaskScreenProps {
  onBack: () => void;
  onSave: (taskData: any) => void;
  editingTask: Task | null;
  categories: Category[];
  teamMembers?: TeamMember[];
  currentRoomCode?: string;
  currentUser?: any;
}

export const AddTaskScreen: React.FC<AddTaskScreenProps> = ({
  onBack,
  onSave,
  editingTask,
  categories,
  teamMembers = [],
  currentRoomCode,
  currentUser,
}) => {
  const effectiveMembers: TeamMember[] =
    teamMembers.length > 0
      ? teamMembers
      : currentUser
      ? [
          {
            id: currentUser.id,
            name: currentUser.displayName || 'You',
            role: currentUser.role || 'Room Creator',
            avatar: '#6366F1',
            avatarUrl: currentUser.avatarUrl,
            initials: (currentUser.displayName || 'ME').substring(0, 2).toUpperCase(),
          },
        ]
      : [];

  const defaultInitialAssignee =
    editingTask?.assignee ||
    currentUser?.displayName ||
    effectiveMembers[0]?.name ||
    'Unassigned';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('URGENT');
  const [categoryId, setCategoryId] = useState<string>('cat-work');
  const [assignee, setAssignee] = useState<string>(defaultInitialAssignee);
  const [dueDateOffsetHours, setDueDateOffsetHours] = useState<number>(24);
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; isCompleted: boolean }[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setPriority(editingTask.priority);
      setCategoryId(editingTask.categoryId || 'cat-work');
      setAssignee(editingTask.assignee || currentUser?.displayName || effectiveMembers[0]?.name || 'Unassigned');
      setSubtasks(
        editingTask.subtasks.map((st) => ({
          id: st.id,
          title: st.title,
          isCompleted: st.isCompleted,
        }))
      );
    } else {
      setTitle('');
      setDescription('');
      setPriority('URGENT');
      setCategoryId(categories[0]?.id || 'cat-work');
      setAssignee(currentUser?.displayName || effectiveMembers[0]?.name || 'Unassigned');
      setDueDateOffsetHours(24);
      setSubtasks([]);
      setNewSubtaskTitle('');
    }
  }, [editingTask, categories, teamMembers, currentUser]);

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      {
        id: 'st_' + Math.random().toString(36).substring(2, 9),
        title: newSubtaskTitle.trim(),
        isCompleted: false,
      },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleSave = () => {
    if (!title.trim()) return;

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const selectedMember = effectiveMembers.find((m) => m.name === assignee);
    const dueDate = new Date(Date.now() + dueDateOffsetHours * 3600 * 1000).toISOString();

    onSave({
      ...(editingTask ? { id: editingTask.id } : {}),
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: editingTask ? editingTask.status : 'TODO',
      assignee: assignee === 'Unassigned' ? null : assignee,
      assigneeAvatarUrl: selectedMember?.avatarUrl || null,
      teamId: 'team-sprint-01',
      teamName: 'Team Room',
      isCompleted: editingTask ? editingTask.isCompleted : false,
      dueDate,
      categoryId,
      categoryName: selectedCategory?.name || 'General',
      categoryColor: selectedCategory?.color || colors.primary,
      subtasks: subtasks.map((st, idx) => ({
        ...st,
        taskId: editingTask?.id || '',
        orderIndex: idx,
      })),
    });

    onBack();
  };

  const priorities: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2A246B" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={onBack} style={styles.backCircleBtn} activeOpacity={0.7}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingTask ? 'Edit Task' : 'New Task'}</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} activeOpacity={0.8}>
            <Text style={styles.saveHeaderText}>Save</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>
          {editingTask
            ? 'Update task details with row-level logical timestamps'
            : 'Assign work to team members with real-time sync'}
        </Text>
      </View>

      {/* Form Content */}
      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Implement OAuth2 Refresh Token Rotation"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            autoFocus={!editingTask}
          />

          <Text style={styles.label}>Notes / Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add context, acceptance criteria, or links..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Priority Selector */}
        <View style={styles.card}>
          <Text style={styles.label}>Priority Level</Text>
          <View style={styles.priorityRow}>
            {priorities.map((p) => {
              const pStyle = colors.priority[p];
              const isSelected = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    { backgroundColor: isSelected ? pStyle.bg : '#F8FAFC', borderColor: isSelected ? pStyle.color : colors.border },
                  ]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      { color: isSelected ? pStyle.color : colors.textSecondary },
                    ]}
                  >
                    {pStyle.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Team Member Assignee Selection */}
        <View style={styles.card}>
          <View style={styles.assigneeHeaderRow}>
            <Text style={styles.label}>Assign to Room Member</Text>
            {currentRoomCode && (
              <View style={styles.roomBadgeSmall}>
                <Text style={styles.roomBadgeSmallText}>🔒 Room: {currentRoomCode}</Text>
              </View>
            )}
          </View>

          {effectiveMembers.length === 0 ? (
            <View style={styles.emptyMembersBox}>
              <Text style={styles.emptyMembersTitle}>No members in this room yet</Text>
              <Text style={styles.emptyMembersText}>
                Share code {currentRoomCode} with collaborators so they can enter this room and receive task assignments.
              </Text>
            </View>
          ) : (
            <View style={styles.assigneeRow}>
              {effectiveMembers.map((tm) => {
                const isSelected = assignee === tm.name;
                return (
                  <TouchableOpacity
                    key={tm.id}
                    style={[
                      styles.assigneeChip,
                      isSelected && { backgroundColor: tm.avatar + '20', borderColor: tm.avatar },
                    ]}
                    onPress={() => setAssignee(tm.name)}
                    activeOpacity={0.7}
                  >
                    {tm.avatarUrl ? (
                      <Image source={{ uri: tm.avatarUrl }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatarFallbackCircle, { backgroundColor: tm.avatar || '#6366F1' }]}>
                        <Text style={styles.avatarFallbackText}>{tm.initials || 'U'}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.assigneeName,
                          isSelected && { color: tm.avatar, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {tm.name} {currentUser && currentUser.displayName === tm.name ? '(You)' : ''}
                      </Text>
                      <Text style={styles.assigneeRole}>{tm.role}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {effectiveMembers.length === 1 && (
            <View style={styles.inviteTipBanner}>
              <Text style={styles.inviteTipText}>
                💡 Want to assign tasks to teammates? Have them enter invite code <Text style={{fontWeight: '700'}}>{currentRoomCode}</Text> in their window!
              </Text>
            </View>
          )}
        </View>

        {/* Category Selection */}
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {categories.map((cat) => {
              const isSelected = categoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.catChip,
                    isSelected && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                  onPress={() => setCategoryId(cat.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text
                    style={[
                      styles.catName,
                      isSelected && { color: cat.color, fontWeight: '700' },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Timeline Offset */}
        <View style={styles.card}>
          <Text style={styles.label}>Due Date Timeline</Text>
          <View style={styles.dateRow}>
            {[
              { label: 'In 3 Hours', hours: 3 },
              { label: 'Today (at 23:59)', hours: 12 },
              { label: 'Tomorrow', hours: 24 },
              { label: 'Next Week', hours: 168 },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.hours}
                style={[
                  styles.dateChip,
                  dueDateOffsetHours === opt.hours && styles.dateChipActive,
                ]}
                onPress={() => setDueDateOffsetHours(opt.hours)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateText,
                    dueDateOffsetHours === opt.hours && styles.dateTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Subtasks Builder */}
        <View style={styles.card}>
          <Text style={styles.label}>Checklist / Subtasks</Text>
          <View style={styles.subtaskInputRow}>
            <TextInput
              style={styles.subtaskInput}
              placeholder="Add actionable subtask..."
              placeholderTextColor={colors.textMuted}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              onSubmitEditing={handleAddSubtask}
            />
            <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtask} activeOpacity={0.8}>
              <Text style={styles.addSubtaskText}>＋ Add</Text>
            </TouchableOpacity>
          </View>

          {subtasks.map((st) => (
            <View key={st.id} style={styles.subtaskItem}>
              <Text style={styles.subtaskBullet}>•</Text>
              <Text style={styles.subtaskTitle}>{st.title}</Text>
              <TouchableOpacity onPress={() => handleRemoveSubtask(st.id)}>
                <Text style={styles.removeSubtaskText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Primary Bottom Button */}
        <TouchableOpacity style={styles.bottomCreateBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.bottomCreateIcon}>✓</Text>
          <Text style={styles.bottomCreateText}>
            {editingTask ? 'Save Task Changes' : 'Create Task (Optimistic Sync)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2A246B',
  },
  header: {
    backgroundColor: '#2A246B',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  saveHeaderBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  saveHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollBody: {
    flex: 1,
    backgroundColor: '#F2F5FC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  assigneeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roomBadgeSmall: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roomBadgeSmallText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
  },
  assigneeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    width: '48%',
  },
  avatarImg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  avatarFallbackCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyMembersBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyMembersTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  emptyMembersText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  inviteTipBanner: {
    marginTop: 10,
    backgroundColor: '#F5F3FF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  inviteTipText: {
    fontSize: 11,
    color: '#5B21B6',
    lineHeight: 16,
  },
  assigneeName: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  assigneeRole: {
    fontSize: 10,
    color: '#64748B',
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  catName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  dateChipActive: {
    backgroundColor: 'rgba(91, 79, 196, 0.1)',
    borderColor: colors.primary,
  },
  dateText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  dateTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0F172A',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addSubtaskBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubtaskText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 6,
  },
  subtaskBullet: {
    fontSize: 14,
    color: colors.primary,
    marginRight: 8,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  removeSubtaskText: {
    fontSize: 14,
    color: '#EF4444',
    padding: 4,
  },
  bottomCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomCreateIcon: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  bottomCreateText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
