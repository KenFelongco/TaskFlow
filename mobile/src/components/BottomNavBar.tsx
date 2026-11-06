import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

export type BottomTabType = 'home' | 'tasks' | 'board' | 'profile';

interface BottomNavBarProps {
  activeTab: BottomTabType;
  onTabChange: (tab: BottomTabType) => void;
  onAddTaskPress: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onAddTaskPress,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('home')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('tasks')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'tasks' && styles.tabIconActive]}>☑</Text>
          <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>Tasks</Text>
        </TouchableOpacity>

        {/* Center Elevated Add Task Button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={onAddTaskPress}
          activeOpacity={0.85}
        >
          <Text style={styles.addBtnIcon}>＋</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('board')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'board' && styles.tabIconActive]}>⊞</Text>
          <Text style={[styles.tabLabel, activeTab === 'board' && styles.tabLabelActive]}>Board</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('profile')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabIconActive]}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' && styles.tabLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: '#5B4FC4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginTop: -2,
  },
  tabIcon: {
    fontSize: 18,
    color: '#94A3B8',
    marginBottom: 2,
  },
  tabIconActive: {
    color: colors.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
