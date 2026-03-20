import { useState, useEffect } from 'react';
import { Keyboard } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';

// Negative = leftward drag required to activate
const ACTIVATE_OFFSET = -25;
const TRIGGER_THRESHOLD = 80; // px (absolute) before navigation fires

// Tight vertical tolerance when keyboard is hidden — 3px hands scroll to
// FlatList almost immediately on any vertical movement.
const FAIL_OFFSET_Y = 3;

/**
 * Adds left-swipe gestures that call `onOpen` when the user swipes far
 * enough to the LEFT. Returns two independent gesture instances:
 *
 * - `headerGesture`: header row (always active, plain View — no scroll conflict)
 * - `bodyGesture`:   full-width chat body — **automatically disabled when the
 *                    keyboard is visible** so `keyboardDismissMode="interactive"`
 *                    gets uncontested first-pixel control over the FlatList touch.
 *
 * Direction rationale:
 * - Right swipe = iOS native back + swipe-to-reply on messages (unchanged)
 * - Left swipe  = open info / profile screen (forward navigation)
 */
export function useSwipeToInfo(onOpen: () => void) {
  const swipeX = useSharedValue(0); // tracks absolute drag distance (always ≥ 0)

  // Disable bodyGesture while the keyboard is up so interactive keyboard dismiss
  // receives the FlatList touch from the very first pixel — no RNGH deliberation window.
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Use "Will" variants on iOS so the gesture is disabled before the
    // keyboard animation begins, avoiding any transition-frame stickiness.
    const show = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const makePan = (enabled: boolean) =>
    Gesture.Pan()
      .enabled(enabled)
      .activeOffsetX(ACTIVATE_OFFSET)
      .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
      .onUpdate((e) => {
        if (e.translationX < 0) {
          swipeX.value = -e.translationX;
        }
      })
      .onEnd((e) => {
        if (-e.translationX > TRIGGER_THRESHOLD) {
          runOnJS(onOpen)();
        }
        swipeX.value = withSpring(0, { damping: 20, stiffness: 300 });
      });

  // Header is a plain View — no FlatList underneath, always active.
  const headerGesture = makePan(true);

  // Body wraps the FlatList — disabled when keyboard is up so scroll dismiss
  // has zero competition. Left-swipe-to-info from the body only works keyboard-hidden.
  const bodyGesture = makePan(!isKeyboardVisible);

  // Indicator slides in from the RIGHT edge as the user swipes left
  const edgeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeX.value, [0, TRIGGER_THRESHOLD], [0, 0.85], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(swipeX.value, [0, Math.abs(ACTIVATE_OFFSET)], [6, 0], Extrapolation.CLAMP) },
    ],
  }));

  return { headerGesture, bodyGesture, edgeIndicatorStyle };
}
