import { useCallback } from "react";
import { useParticles } from "@/components/EmojiParticles";
import { useWebHaptics } from "web-haptics/react";
import { isHapticsEnabled } from "@/hooks/useHapticsEnabled";

type HapticPreset = "light" | "medium" | "heavy" | "selection" | "success" | "error";

/**
 * Centralized game feedback — haptics + emoji particles.
 * Used by both SinglePlayerScreen and MultiplayerView.
 */
export function useGameFeedback() {
  const { burst } = useParticles();
  const haptic = useWebHaptics();

  const triggerHaptic = useCallback(
    (preset: HapticPreset) => {
      if (isHapticsEnabled()) haptic.trigger(preset);
    },
    [haptic]
  );

  /** Merge-based haptic feedback during play. */
  const onMoveFeedback = useCallback(
    (maxMerge: number, moved: boolean) => {
      if (!moved || maxMerge === 0) return;
      if (maxMerge >= 256) {
        triggerHaptic("medium");
      } else {
        triggerHaptic("selection");
      }
    },
    [triggerHaptic]
  );

  /** Game over feedback — emoji burst + haptic. */
  const onGameOverFeedback = useCallback(
    (options?: { isDailyBest?: boolean }) => {
      if (options?.isDailyBest) {
        burst("dailyBest");
        triggerHaptic("heavy");
      } else {
        burst("gameOver");
        triggerHaptic("error");
      }
    },
    [burst, triggerHaptic]
  );

  /** Win feedback — emoji burst + haptic. */
  const onWinFeedback = useCallback(() => {
    burst("win");
    triggerHaptic("success");
  }, [burst, triggerHaptic]);

  return { triggerHaptic, burst, onMoveFeedback, onGameOverFeedback, onWinFeedback };
}
