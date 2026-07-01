import type { GeminiModelId } from "@naamkaran/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearByokKey, loadByokKey, saveByokKey } from "./byok";
import { loadGeminiModel, saveGeminiModel } from "./gemini-model";

interface ByokContextValue {
  apiKey: string | null;
  isActive: boolean;
  modelId: GeminiModelId;
  setModelId: (modelId: GeminiModelId) => void;
  saveByok: (apiKey: string, modelId: GeminiModelId) => void;
  clearByok: () => void;
}

const ByokContext = createContext<ByokContextValue | null>(null);

export function ByokProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => loadByokKey());
  const [modelId, setModelIdState] = useState<GeminiModelId>(() => loadGeminiModel());

  const setModelId = useCallback((nextModelId: GeminiModelId) => {
    setModelIdState(nextModelId);
    saveGeminiModel(nextModelId);
  }, []);

  const saveByok = useCallback((key: string, model: GeminiModelId) => {
    saveByokKey(key);
    setApiKey(key);
    setModelId(model);
  }, [setModelId]);

  const clearByok = useCallback(() => {
    clearByokKey();
    setApiKey(null);
  }, []);

  const value = useMemo(
    () => ({
      apiKey,
      isActive: apiKey !== null,
      modelId,
      setModelId,
      saveByok,
      clearByok,
    }),
    [apiKey, modelId, setModelId, saveByok, clearByok],
  );

  return <ByokContext.Provider value={value}>{children}</ByokContext.Provider>;
}

export function useByok(): ByokContextValue {
  const context = useContext(ByokContext);
  if (!context) {
    throw new Error("useByok must be used within ByokProvider");
  }
  return context;
}
