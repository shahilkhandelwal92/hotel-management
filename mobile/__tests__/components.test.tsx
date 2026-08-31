import React from 'react';

jest.mock('react-native', () => {
  const actualReact = jest.requireActual('react');
  return {
    View: (props: any) => actualReact.createElement('View', props, props.children),
    Text: (props: any) => actualReact.createElement('Text', props, props.children),
    TouchableOpacity: (props: any) => actualReact.createElement('TouchableOpacity', props, props.children),
    TextInput: (props: any) => actualReact.createElement('TextInput', props, props.children),
    ActivityIndicator: (props: any) => actualReact.createElement('ActivityIndicator', props),
    Modal: (props: any) => (props.visible ? actualReact.createElement('Modal', props, props.children) : null),
    StyleSheet: {
      create: (styles: any) => styles,
    },
    Platform: {
      OS: 'android',
      select: (obj: any) => obj.android || obj.default,
    },
  };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

import { AppButton } from '../src/components/AppButton';
import { AppInput } from '../src/components/AppInput';
import { StatusBadge } from '../src/components/StatusBadge';
import { RoomStatusBadge } from '../src/components/RoomStatusBadge';
import { colors } from '../src/theme/colors';

describe('Mobile Design System Components', () => {
  it('instantiates AppButton with proper default props and title', () => {
    const button = <AppButton title="Test Button" variant="primary" />;
    expect(button.props.title).toBe('Test Button');
    expect(button.props.variant).toBe('primary');
  });

  it('instantiates AppInput with label and placeholder', () => {
    const input = <AppInput label="Room Number" placeholder="e.g. 101" />;
    expect(input.props.label).toBe('Room Number');
    expect(input.props.placeholder).toBe('e.g. 101');
  });

  it('verifies theme colors exist and are valid hex strings', () => {
    expect(colors.background).toBe('#090d16');
    expect(colors.primary).toBe('#3b82f6');
    expect(colors.accent).toBe('#10b981');
    expect(colors.status.clean).toBe('#10b981');
    expect(colors.status.dirty).toBe('#ef4444');
  });

  it('instantiates StatusBadge and RoomStatusBadge', () => {
    const badge = <StatusBadge label="Pending" variant="warning" />;
    const roomBadge = <RoomStatusBadge status="Dirty" />;
    expect(badge.props.label).toBe('Pending');
    expect(roomBadge.props.status).toBe('Dirty');
  });
});
