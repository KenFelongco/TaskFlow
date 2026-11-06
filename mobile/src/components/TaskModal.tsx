import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { colors } from '../theme/colors';
import { Task, Priority, Category, TeamMember } from '../types';

interface TaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  editingTask: Task | null;
  categories: Category[];
  teamMembers?: TeamMember[];
  currentUser?: any;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  visible,
  onClose,
  onSave,
  editingTask,
  categories,
  teamMembers = [],
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

  const defaultAssignee =
    editingTask?.assignee ||
    currentUser?.displayName ||
    effectiveMembers[0]?.name ||
    'Unassigned';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [categoryId, setCategoryId] = useState<string>('cat-work');
  const [assignee, setAssignee] = useState<string>(defaultAssignee);
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
      setPriority('MEDIUM');
      setCategoryId(categories[0]?.id || 'cat-work');
      setAssignee(currentUser?.displayName || effectiveMembers[0]?.name || 'Unassigned');
      setDueDateOffsetHours(24);
      setSubtasks([]);
      setNewSubtaskTitle('');
    }
  }, [editingTask, visible, teamMembers, currentUser]);

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

    onClose();
  };

  const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editingTask ? 'Edit Task' : 'Create New Task'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Title */}
            <Text style={styles.label}>Task Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Implement WebSocket reconnection"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            {/* Description */}
            <Text style={styles.label}>Description / Markdown Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add key context, links, or acceptance criteria..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            {/* Assignee / Team Member */}
            <Text style={styles.label}>Room Member Assignee</Text>
            {effectiveMembers.length === 0 ? (
              <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 12 }}>No room members joined yet</Text>
            ) : (
              <View style={styles.assigneeRow}>
                {effectiveMembers.map((tm) => {
                  const isSelected = assignee === tm.name;
                  return (
                    <TouchableOpacity
                      key={tm.id}
                      style={[
                        styles.assigneeChip,
                        isSelected && { backgroundColor: tm.avatar + '25', borderColor: tm.avatar },
                      ]}
                      onPress={() => setAssignee(tm.name)}
                    >
                      <View style={[styles.avatarCircle, { backgroundColor: tm.avatar || '#6366F1' }]}>
                        <Text style={styles.avatarInitials}>{tm.initials || 'U'}</Text>
                      </View>
                      <Text
                        style={[
                          styles.assigneeName,
                          isSelected && { color: tm.avatar, fontWeight: '700' },
                        ]}
                      >
                        {tm.name} {currentUser && currentUser.displayName === tm.name ? '(You)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Priority */}
            <Text style={styles.label}>Priority Level</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => {
                const style = colors.priority[p];
                const isSelected = priority === p;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityOption,
                      { borderColor: style.border },
                      isSelected && { backgroundColor: style.bg, borderColor: style.color },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: isSelected ? style.color : colors.textSecondary },
                      ]}
                    >
                      {style.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Category */}
            <Text style={styles.label}>Category / Project</Text>
            <View style={styles.categoryRow}>
              {categories.map((cat) => {
                const isSelected = categoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      isSelected && { backgroundColor: cat.color + '25', borderColor: cat.color },
                    ]}
                    onPress={() => setCategoryId(cat.id)}
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

            {/* Due Date Shortcut */}
            <Text style={styles.label}>Due Date Timeline</Text>
            <View style={styles.dateRow}>
              {[
                { label: 'In 3 Hours', hours: 3 },
                { label: 'Tomorrow', hours: 24 },
                { label: 'In 3 Days', hours: 72 },
                { label: 'Next Week', hours: 168 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.hours}
                  style={[
                    styles.dateChip,
                    dueDateOffsetHours === opt.hours && styles.dateChipActive,
                  ]}
                  onPress={() => setDueDateOffsetHours(opt.hours)}
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

            {/* Subtasks */}
            <Text style={styles.label}>Subtasks & Checklist</Text>
            <View style={styles.subtaskInputRow}>
              <TextInput
                style={styles.subtaskInput}
                placeholder="Add subtask..."
                placeholderTextColor={colors.textMuted}
                value={newSubtaskTitle}
                onChangeText={setNewSubtaskTitle}
                onSubmitEditing={handleAddSubtask}
              />
              <TouchableOpacity style={styles.addSubtaskBtn} onPress={handleAddSubtask}>
                <Text style={styles.addSubtaskText}>＋ Add</Text>
              </TouchableOpacity>
            </View>

            {subtasks.map((st) => (
              <View key={st.id} style={styles.subtaskRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.subtaskTitleText}>{st.title}</Text>
                <TouchableOpacity onPress={() => handleRemoveSubtask(st.id)}>
                  <Text style={styles.removeSubtask}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>{editingTask ? 'Save Changes' : 'Create Task'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    fontSize: 16,
    color: colors.textMuted,
  },
  scroll: {
    paddingBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  assigneeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  avatarCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarInitials: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  assigneeName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '700',
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
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  catName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dateChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  subtaskInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addSubtaskBtn: {
    backgroundColor: colors.surfaceActive,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addSubtaskText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: colors.bg,
    borderRadius: 6,
    marginBottom: 4,
  },
  bullet: {
    color: colors.primary,
    fontSize: 14,
    marginRight: 8,
  },
  subtaskTitleText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  removeSubtask: {
    color: colors.danger,
    fontSize: 12,
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
