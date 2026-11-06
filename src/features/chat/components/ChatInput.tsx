import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RADIUS } from '../../../constants/theme';
import type { AppTheme } from '../../../constants/theme';
import { STRINGS } from '../../../constants/strings';
import { useSettings } from '../../../stores/settings/settingsStore';

type Props = {
  value: string;
  placeholder: string;
  isSearching: boolean;
  showSuggestions: boolean;
  paddingV: number;
  theme: AppTheme;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onFocus: () => void;
};

export function ChatInput({
  value,
  placeholder,
  isSearching,
  showSuggestions,
  paddingV,
  theme,
  onChangeText,
  onSubmit,
  onFocus,
}: Props) {
  const { language } = useSettings();
  const [isFocused, setIsFocused] = useState(false);
  const highlighted = isFocused || showSuggestions;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus();
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[
          styles.input,
          {
            paddingVertical: paddingV,
            borderColor: highlighted ? theme.colors.primary : theme.colors.inputBorder,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.textPrimary,
          },
        ]}
        placeholder={placeholder}
        accessibilityLabel={STRINGS[language].a11ySearchInput}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={() => setIsFocused(false)}
        onPressIn={onFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        blurOnSubmit={false}
        placeholderTextColor={theme.colors.textTertiary}
        editable
      />
      <View style={styles.leading} pointerEvents="none">
        <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textTertiary} />
      </View>
      {isSearching ? (
        <View style={styles.trailing} pointerEvents="none">
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : value.length > 0 ? (
        <Pressable
          style={styles.trailing}
          onPress={() => onChangeText('')}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={STRINGS[language].a11yClear}
        >
          <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', justifyContent: 'center' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingLeft: 44,
    paddingRight: 52,
    fontSize: 16,
  },
  leading: { position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' },
  trailing: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
