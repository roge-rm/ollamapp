import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import {
  useNavigation,
  CommonActions,
  CompositeNavigationProp,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card } from '../components';
import { createStyles } from './SettingsScreen.styles';
import { SettingsAppearanceRow } from './SettingsAppearanceRow';
import { AnimatedEntry } from '../components/AnimatedEntry';
import { AnimatedListItem } from '../components/AnimatedListItem';
import { MadeWithLove } from '../components/MadeWithLove';
import { DebugLogsScreen } from '../components/DebugLogsScreen';
import { useFocusTrigger } from '../hooks/useFocusTrigger';
import { useTheme, useThemedStyles } from '../theme';
import { useAppStore } from '../stores';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { appVersion } from '../utils/appVersion';
import { ScreenHeader } from '../components/ScreenHeader';

type NavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'SettingsTab'>,
  NativeStackNavigationProp<RootStackParamList>
>;

/** Developer-only: load the demo fixture and report what it added. Never throws. */
async function loadDemoData(): Promise<void> {
  try {
    const { seedDemoData } = require('../services/demoSeed');
    const { buildVoiceAttachment } = require('../components/ChatInput/voiceNoteSend');
    const result = await seedDemoData({ buildVoiceAttachment });
    const missing = result.warnings.length ? `\n\n${result.warnings.join('\n\n')}` : '';
    Alert.alert(
      result.warnings.length ? 'Demo loaded with missing documents' : 'Demo ready',
      `${result.chats} chats and ${result.documents} documents added. Existing matching demo records were kept.${missing}`,
    );
  } catch (error) {
    Alert.alert('Demo not loaded', error instanceof Error ? error.message : String(error));
  }
}

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const focusTrigger = useFocusTrigger();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);
  const themeMode = useAppStore(s => s.themeMode);
  const setThemeMode = useAppStore(s => s.setThemeMode);
  const completeChecklistStep = useAppStore(s => s.completeChecklistStep);
  const [showDebugLogs, setShowDebugLogs] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  useEffect(() => {
    completeChecklistStep('exploredSettings');
  }, [completeChecklistStep]);

  const handleSeedDemo = async () => {
    if (!__DEV__ || isSeedingDemo) return;
    setIsSeedingDemo(true);
    await loadDemoData();
    setIsSeedingDemo(false);
  };

  const handleResetOnboarding = () => {
    setOnboardingComplete(false);
    // Back to first-launch setup
    // getParent() reaches the RootStack from inside the Tab navigator
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'AutoSetup' }],
      }),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader title="Settings" variant="tab" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <SettingsAppearanceRow
          focusTrigger={focusTrigger}
          styles={styles}
          colors={colors}
          themeMode={themeMode}
          onSelect={setThemeMode}
        />

        {/* Navigation Items */}
          <View style={styles.navSection}>
            {[
              {
                icon: 'sliders',
                title: 'Model Settings',
                desc: 'System prompt, generation, and performance',
                screen: 'ModelSettings' as const,
                testID: 'open-model-settings',
              },
              {
                icon: 'wifi',
                title: 'Remote Servers',
                desc: 'Connect to Ollama, LM Studio, and more',
                screen: 'RemoteServers' as const,
              },
              //  { icon: 'search', title: 'Web Search', desc: 'Configure search API key for reliable results', screen: 'WebSearchSettings' as const },
              {
                icon: 'lock',
                title: 'Security',
                desc: 'Passphrase and app lock',
                screen: 'SecuritySettings' as const,
              },
              {
                icon: 'smartphone',
                title: 'Device Information',
                desc: 'Hardware and compatibility',
                screen: 'DeviceInfo' as const,
              },
              {
                icon: 'hard-drive',
                title: 'Storage',
                desc: 'Models and data usage',
                screen: 'StorageSettings' as const,
              },
            ].map((item, index, arr) => (
              <AnimatedListItem
                key={item.screen}
                index={index + 1}
                staggerMs={40}
                trigger={focusTrigger}
                style={[
                  styles.navItem,
                  index === arr.length - 1 && styles.navItemLast,
                ]}
                onPress={() => navigation.navigate(item.screen)}
                testID={'testID' in item ? item.testID : undefined}
              >
                <View style={styles.navItemIcon}>
                  <Icon
                    name={item.icon}
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.navItemContent}>
                  <Text style={styles.navItemTitle}>{item.title}</Text>
                  <Text style={styles.navItemDesc}>{item.desc}</Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textMuted} />
              </AnimatedListItem>
            ))}
          </View>

        {/* About */}
        <AnimatedEntry index={9} staggerMs={40} trigger={focusTrigger}>
          <View style={styles.navSection}>
            <TouchableOpacity
              style={[styles.navItem, styles.navItemLast]}
              onPress={() => navigation.navigate('About')}
            >
              <View style={styles.navItemIcon}>
                <Icon name="info" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.navItemContent}>
                <Text style={styles.navItemTitle}>About</Text>
                <Text style={styles.navItemDesc}>
                  Version {appVersion()}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </AnimatedEntry>

        {/* Privacy */}
        <AnimatedEntry index={10} staggerMs={40} trigger={focusTrigger}>
          <Card style={styles.privacyCard}>
            <View style={styles.privacyIconContainer}>
              <Icon name="shield" size={18} color={colors.textSecondary} />
            </View>
            <Text style={styles.privacyTitle}>Privacy First</Text>
            <Text style={styles.privacyText}>
              All your data stays on this device. No conversations, prompts, or
              personal information is ever sent to any server.
            </Text>
          </Card>
        </AnimatedEntry>

        {/* Dev-only tooling — stripped from release builds */}
        {__DEV__ && (
          <AnimatedEntry index={11} staggerMs={40} trigger={focusTrigger}>
            <View style={styles.devButtonGroup}>
              <TouchableOpacity
                style={styles.devButton}
                onPress={handleSeedDemo}
                disabled={isSeedingDemo}
                accessibilityRole="button"
                accessibilityLabel={
                  isSeedingDemo ? 'Loading demo data' : 'Load demo data'
                }
                accessibilityState={{
                  disabled: isSeedingDemo,
                  busy: isSeedingDemo,
                }}
                testID="seed-demo-data"
              >
                <Icon name="database" size={14} color={colors.textMuted} />
                <Text style={styles.devButtonText}>
                  {isSeedingDemo ? 'Loading demo data...' : 'Load demo data'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={handleResetOnboarding}
              >
                <Icon name="rotate-ccw" size={14} color={colors.textMuted} />
                <Text style={styles.devButtonText}>Reset Onboarding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.devButton}
                onPress={() => setShowDebugLogs(true)}
              >
                <Icon name="terminal" size={14} color={colors.textMuted} />
                <Text style={styles.devButtonText}>Debug Logs</Text>
              </TouchableOpacity>
            </View>
          </AnimatedEntry>
        )}

        <MadeWithLove />
        {__DEV__ && (
          <DebugLogsScreen
            visible={showDebugLogs}
            onClose={() => setShowDebugLogs(false)}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
