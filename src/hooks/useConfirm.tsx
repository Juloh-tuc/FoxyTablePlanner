import { useState, useCallback } from "react";

export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean; message: string; resolver?: (v: boolean)=>void;
  }>({ open:false, message:"" });

  const ask = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      setState({ open:true, message, resolver: resolve });
    });
  }, []);

  const resolve = (ok: boolean) => {
    state.resolver?.(ok);
    setState(s => ({ ...s, open:false }));
  };

  return {
    open: state.open,
    message: state.message,
    ask,
    confirm: () => resolve(true),
    cancel: () => resolve(false),
  };
}
