// src/hooks/useProjector.ts
import { useEffect } from "react";

export function useProjector(enabled: boolean) {
  useEffect(() => {
    document.documentElement.classList.toggle("projector", enabled);
    return () => document.documentElement.classList.remove("projector");
  }, [enabled]);
}
