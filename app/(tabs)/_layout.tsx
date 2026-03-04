import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Badge } from '../../src/components/ui/Badge';
import { useMessagesStore } from '../../src/stores/useMessagesStore';
import { useAIStore } from '../../src/stores/useAIStore';
import { useThemeColors } from '../../src/hooks/useThemeColors';
import { useColorScheme } from 'nativewind';

export default function TabLayout() {
  const unreadCount = useMessagesStore((s) => s.getUnreadCount());
  const aiUnreadCount = useAIStore((s) => s.getUnreadCount());
  const themeColors = useThemeColors();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.accent.primary,
        tabBarInactiveTintColor: themeColors.text.tertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : themeColors.background.secondary,
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingTop: 8,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: isDark
                  ? 'rgba(26, 20, 18, 0.75)'
                  : 'rgba(255, 241, 230, 0.75)',
              }}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubbles" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -10 }}>
                  <Badge count={unreadCount} />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="sparkles" size={size} color={color} />
              {aiUnreadCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -10 }}>
                  <Badge count={aiUnreadCount} />
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
