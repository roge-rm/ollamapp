/**
 * ToolsScreen Tests
 *
 * The tools picker is a full page (it replaced the old bottom-sheet drawer). Tests:
 * - Renders the page header and all free tool rows
 * - There is no Pro Tools row
 * - Tool toggles flow through the core settings store
 * - Back button navigates back
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ToolsScreen } from '../../../src/screens/ToolsScreen';
import { AVAILABLE_TOOLS } from '../../../src/services/tools/registry';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  };
});

const mockUpdateSettings = jest.fn();
let mockEnabledTools: string[] = [];
const mockSetHintDismissed = jest.fn();
jest.mock('../../../src/stores', () => ({
  useAppStore: Object.assign(
    (selector?: any) => {
      const state = {
        settings: { enabledTools: mockEnabledTools },
        updateSettings: mockUpdateSettings,
        toolCountHintDismissed: false,
        setToolCountHintDismissed: mockSetHintDismissed,
      };
      return selector ? selector(state) : state;
    },
    { getState: () => ({ settings: { enabledTools: mockEnabledTools }, updateSettings: mockUpdateSettings }) },
  ),
}));

jest.mock('react-native-vector-icons/Feather', () => {
  const { Text } = require('react-native');
  return ({ name, ...props }: any) => <Text {...props}>{name}</Text>;
});
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name, ...props }: any) => <Text {...props}>{name}</Text>;
});

jest.mock('../../../src/theme', () => {
  const mockColors = {
    text: '#000', textMuted: '#999', textSecondary: '#666',
    primary: '#007AFF', background: '#FFF', surface: '#F5F5F5', border: '#E0E0E0',
  };
  return {
    useTheme: () => ({ colors: mockColors, shadows: {} }),
    useThemedStyles: (createStyles: Function) => createStyles(mockColors, {}),
  };
});

describe('ToolsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnabledTools = ['web_search', 'calculator'];
  });

  it('renders the page header and every free tool row', () => {
    const { getByText, getByTestId } = render(<ToolsScreen />);
    expect(getByText('Tools')).toBeTruthy();
    for (const tool of AVAILABLE_TOOLS) {
      expect(getByTestId(`tool-picker-row-${tool.id}`)).toBeTruthy();
    }
  });

  it('has no Pro Tools row', () => {
    const { queryByTestId, queryByText } = render(<ToolsScreen />);
    expect(queryByTestId('tools-pro-tools')).toBeNull();
    expect(queryByText('Pro Tools')).toBeNull();
  });

  it('toggles a tool through the core settings store', () => {
    const { getAllByRole } = render(<ToolsScreen />);
    const switches = getAllByRole('switch');
    // web_search + calculator are enabled, get_current_datetime is not.
    fireEvent(switches[2], 'valueChange', true);
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      enabledTools: ['web_search', 'calculator', 'get_current_datetime'],
    });
  });

  it('navigates back when the back button is pressed', () => {
    const { getByText } = render(<ToolsScreen />);
    fireEvent.press(getByText('arrow-left'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
