import React from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import type { AppTheme } from '../../../constants/theme';

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
  return (
    <View style={styles.wrapper}>
      <TextInput
        style={[
          styles.input,
          {
            paddingVertical: paddingV,
            borderColor: showSuggestions ? theme.colors.primary : theme.colors.inputBorder,
            backgroundColor: theme.colors.inputBackground,
            color: theme.colors.textPrimary,
            borderTopLeftRadius: showSuggestions ? 0 : 12,
            borderTopRightRadius: showSuggestions ? 0 : 12,
          },
        ]}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onPressIn={onFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        blurOnSubmit={false}
        placeholderTextColor={theme.colors.muted}
        editable
      />
      {isSearching && (
        <View style={styles.indicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingRight: 44, fontSize: 16 },
  indicator: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
});
