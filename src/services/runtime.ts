import { useEffect, useState } from "react";
import type { RuntimeInfo } from "../shared/runtime";
import { getDesktopApi, hasDesktopApi } from "./api";

let cached: Promise<RuntimeInfo> | null = null;

/** Runtime identity is stable for a session; storage figures are refreshed by callers. */
export function loadRuntimeInfo(): Promise<RuntimeInfo> {
  if (!cached) {
    cached = getDesktopApi()
      .getRuntimeInfo()
      .catch((error: unknown) => {
        cached = null;
        throw error;
      });
  }
  return cached;
}

export function useRuntimeInfo(): RuntimeInfo | null {
  const [info, setInfo] = useState<RuntimeInfo | null>(null);
  useEffect(() => {
    if (!hasDesktopApi()) return;
    let active = true;
    void loadRuntimeInfo()
      .then((value) => {
        if (active) setInfo(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return info;
}
