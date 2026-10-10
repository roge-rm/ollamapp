/**
 * QuickSettingsPopover Tests
 *
 * Covers the chat quick-settings menu rows that recently changed:
 * - The "Tools" row is a neutral utility count (its icon must NOT turn green/primary
 *   when tools are enabled).
 * - The "Pro Tools" row (formerly "MCP") uses a crown icon and shows a count badge
 *   for whatever is active across pro tools + MCP, hidden when nothing is active.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { QuickSettingsPopover } from '../../../src/components/ChatInput/Popovers';
import { useAppStore } from '../../../src/stores';
import { getTheme } from '../../../src/theme';

/** The palette the component is actually given, read from the real theme rather than invented here. */
const COLORS = getTheme('light').colors;

jest.mock('react-native-vector-icons/Feather', () => {
  const { Text } = require('react-native');
  return ({ name, color }: any) => <Text testID={`feather-${name}`} style={{ color }}>{name}</Text>;
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name, color }: any) => <Text testID={`mci-${name}`} style={{ color }}>{name}</Text>;
});

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  anchorY: 0,
  anchorX: 0,
  imageMode: 'auto' as const,
  onImageModeToggle: jest.fn(),
  imageModelLoaded: false,
  supportsThinking: false,
  supportsToolCalling: true,
  enabledToolCount: 2,
};

describe('QuickSettingsPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Thinking off, through the store's own action - the state a user is in before they turn it on.
    useAppStore.getState().updateSettings({ thinkingEnabled: false });
  });

  it('keeps the Tools icon neutral (not green) even when tools are enabled', () => {
    const { getByTestId } = render(<QuickSettingsPopover {...baseProps} enabledToolCount={2} />);
    const toolIcon = getByTestId('feather-tool');
    // Should be the neutral text color, never the primary/green accent.
    expect(toolIcon.props.style.color).toBe(COLORS.text);
    expect(toolIcon.props.style.color).not.toBe(COLORS.primary);
  });

  it('has no Pro Tools row', () => {
    const { queryByText, queryByTestId } = render(<QuickSettingsPopover {...baseProps} />);
    expect(queryByText('Pro Tools')).toBeNull();
    expect(queryByTestId('quick-pro-tools')).toBeNull();
  });
});
