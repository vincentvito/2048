import { useState, useCallback } from "react";

const KEY = "2048_haptics_enabled";

function getStored(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function useHapticsEnabled() {
  const [enabled, setEnabledState] = useState(getStored);

  const setEnabled = useCallback((v: boolean) => {
    setEnabledState(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* noop */
    }
  }, []);

  return { hapticsEnabled: enabled, setHapticsEnabled: setEnabled };
}

export function isHapticsEnabled(): boolean {
  return getStored();
}
