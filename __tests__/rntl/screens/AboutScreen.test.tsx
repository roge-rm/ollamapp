/**
 * AboutScreen: shows the app name, credits the app it's built from, and has no social links.
 */
import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

// Navigation is globally mocked in jest.setup.ts.
jest.mock('../../../src/hooks/useFocusTrigger', () => ({ useFocusTrigger: () => 0 }));

jest.mock('../../../src/components/AnimatedListItem', () => ({
  AnimatedListItem: ({ children, onPress, style, testID }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity style={style} onPress={onPress} testID={testID}>{children}</TouchableOpacity>;
  },
}));

import { AboutScreen } from '../../../src/screens/AboutScreen';

describe('AboutScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('shows the app name', () => {
    const { getByText } = render(<AboutScreen />);
    expect(getByText('Ollamapp')).toBeTruthy();
  });

  it('opens the original project when the credit row is tapped', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByText } = render(<AboutScreen />);
    fireEvent.press(getByText('Based on Off Grid AI'));
    expect(openURL).toHaveBeenCalledWith('https://github.com/off-grid-ai/OGAM');
  });

  it('has no X or Slack rows', () => {
    const { queryByTestId } = render(<AboutScreen />);
    expect(queryByTestId('about-follow-on-x')).toBeNull();
    expect(queryByTestId('about-join-slack')).toBeNull();
  });
});
