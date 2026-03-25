import * as Haptics from 'expo-haptics';

const isIOS = process.env.EXPO_OS === 'ios';

export function lightImpact() {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export function mediumImpact() {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export function heavyImpact() {
  if (isIOS) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

export function successNotification() {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export function warningNotification() {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

export function errorNotification() {
  if (isIOS) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

export function selectionFeedback() {
  if (isIOS) {
    Haptics.selectionAsync();
  }
}
