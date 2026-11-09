import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors } from '../theme/colors';
import { Task, TaskStatus } from '../types';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEditPress: (task: Task) => void;
  onDeletePress: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  showChevron?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEditPress,
  onDeletePress,
  onToggleSubtask,
  onStatusChange,
  showChevron = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const priorityStyle = colors.priority[task.priority] || colors.priority.MEDIUM;

  const cycleStatus = () => {
    if (!onStatusChange) return;
    const current = task.status || (task.isCompleted ? 'COMPLETED' : 'TODO');
    if (current === 'TODO') {
      onStatusChange(task.id, 'IN_PROGRESS');
    } else if (current === 'IN_PROGRESS') {
      onStatusChange(task.id, 'COMPLETED');
    } else {
      onStatusChange(task.id, 'TODO');
    }
  };

  const getStatusBadge = () => {
    const s = task.status || (task.isCompleted ? 'COMPLETED' : 'TODO');
    if (s === 'IN_PROGRESS') {
      return { label: '⏳ In Progress', bg: '#FEF3C7', color: '#D97706' };
    }
    if (s === 'COMPLETED' || task.isCompleted) {
      return { label: '✓ Done', bg: '#D1FAE5', color: '#059669' };
    }
    return { label: '📋 To Do', bg: '#EFF6FF', color: '#2563EB' };
  };
  const statusBadge = getStatusBadge();

  const completedSubtasks = task.subtasks.filter((st) => st.isCompleted).length;
  const totalSubtasks = task.subtasks.length;

  const formatDueDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isPast = date < now;
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return { text: `Today at ${timeStr}`, isPast: false };
    if (isPast) return { text: `${date.toLocaleDateString()} ${timeStr}`, isPast: true };
    return { text: `${date.toLocaleDateString()} ${timeStr}`, isPast: false };
  };

  const due = formatDueDate(task.dueDate);

  const getAssigneeInitials = (name?: string | null) => {
    if (!name) return 'YO';
    if (name.toLowerCase() === 'you') return 'YO';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getAssigneeInitials(task.assignee);

  return (
    <View style={[styles.card, task.isCompleted && styles.cardCompleted]}>
      {/* Top Badges Row matching mockup */}
      <View style={styles.topBadgesRow}>
        <View style={styles.badgesLeft}>
          {/* Priority Pill */}
          <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
            <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
              {priorityStyle.label}
            </Text>
          </View>

          {/* Status Badge (Trello-style cycle button) */}
          <TouchableOpacity
            style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}
            onPress={cycleStatus}
            disabled={!onStatusChange}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.label}
            </Text>
          </TouchableOpacity>

          {/* Category Pill */}
          {task.categoryName && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{task.categoryName}</Text>
            </View>
          )}

          {/* HLC Clock Pill */}
          <View style={styles.hlcPill}>
            <Text style={styles.hlcText}>HLC: v{task.logicalTimestamp || task.version || 101}</Text>
          </View>

          {/* Real Assignee Photo Avatar with fallback */}
          {task.assigneeAvatarUrl ? (
            <Image source={{ uri: task.assigneeAvatarUrl }} style={styles.assigneeAvatarImg} />
          ) : (
            <View style={styles.assigneeAvatarFallback}>
              <Text style={styles.assigneeAvatarText}>{initials}</Text>
            </View>
          )}

          {/* Offline Sync Pending Tag */}
          {task.isPendingSync && (
            <View style={styles.pendingSyncPill}>
              <Text style={styles.pendingSyncText}>⏳ Queued</Text>
            </View>
          )}
        </View>

        {/* Right Action: Chevron or Options */}
        {showChevron ? (
          <TouchableOpacity onPress={() => onEditPress(task)} style={styles.chevronBtn}>
            <Text style={styles.chevronIcon}>›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => onEditPress(task)} style={styles.moreBtn}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content: Checkbox & Text */}
      <View style={styles.contentRow}>
        <TouchableOpacity
          style={[styles.checkbox, task.isCompleted && styles.checkboxActive]}
          onPress={() => onToggleComplete(task.id)}
          activeOpacity={0.7}
        >
          {task.isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textWrap}
          onPress={() => onEditPress(task)}
          activeOpacity={0.9}
        >
          <Text style={[styles.title, task.isCompleted && styles.titleCompleted]}>
            {task.title}
          </Text>

          {task.description ? (
            <Text
              style={[styles.description, task.isCompleted && styles.descCompleted]}
              numberOfLines={2}
            >
              {task.description}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Footer Info Row */}
      <View style={styles.footerRow}>
        <View style={styles.footerLeft}>
          {due && (
            <View style={styles.dueItem}>
              <Text style={styles.calendarIcon}>🗓️</Text>
              <Text style={[styles.dueText, due.isPast && !task.isCompleted && styles.overdueText]}>
                {due.text}
              </Text>
            </View>
          )}

          {totalSubtasks > 0 && (
            <TouchableOpacity
              style={styles.checklistDropdown}
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.checklistText}>
                Checklist: {completedSubtasks}/{totalSubtasks} {isExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {task.assignee && (
          <Text style={styles.assignedLabel}>Assigned: {task.assignee}</Text>
        )}
      </View>

      {/* Expanded Checklist Subtasks */}
      {isExpanded && totalSubtasks > 0 && (
        <View style={styles.subtasksContainer}>
          {task.subtasks.map((st) => (
            <TouchableOpacity
              key={st.id}
              style={styles.subtaskItem}
              onPress={() => onToggleSubtask(task.id, st.id)}
              activeOpacity={0.65}
            >
              <View style={[styles.subtaskBox, st.isCompleted && styles.subtaskBoxDone]}>
                {st.isCompleted && <Text style={styles.subtaskCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.subtaskTitle, st.isCompleted && styles.subtaskTitleDone]}>
                {st.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.85)',
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardCompleted: {
    opacity: 0.7,
    backgroundColor: '#FAFAFC',
  },
  topBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgesLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  categoryPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '600',
  },
  hlcPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hlcText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  assigneeAvatarImg: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assigneeAvatarText: {
    color: '#6D28D9',
    fontSize: 9,
    fontWeight: '800',
  },
  pendingSyncPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingSyncText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  moreBtn: {
    paddingHorizontal: 4,
  },
  moreIcon: {
    fontSize: 16,
    color: '#94A3B8',
    letterSpacing: 1,
  },
  chevronBtn: {
    paddingHorizontal: 4,
  },
  chevronIcon: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    backgroundColor: '#FFF',
  },
  checkboxActive: {
    backgroundColor: '#5B4FC4',
    borderColor: '#5B4FC4',
  },
  checkmark: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 17,
  },
  descCompleted: {
    color: '#94A3B8',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dueItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  dueText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  checklistDropdown: {
    paddingVertical: 2,
  },
  checklistText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  assignedLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  subtasksContainer: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  subtaskBox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  subtaskBoxDone: {
    backgroundColor: '#5B4FC4',
    borderColor: '#5B4FC4',
  },
  subtaskCheckmark: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  subtaskTitle: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  subtaskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
});
