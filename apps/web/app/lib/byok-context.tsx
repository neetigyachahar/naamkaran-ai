import type { OpenRouterModelId } from "@naamkaran/shared";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { clearByokKey, loadByokKey, saveByokKey } from "./byok";
import {
  clearDeepBrandSearch,
  loadDeepBrandSearch,
  saveDeepBrandSearch,
} from "./brand-search-mode";
import { loadModel, saveModel } from "./model";
import { AnalyticsEvents, trackEvent } from "./analytics";

interface ByokContextValue {
  apiKey: string | null;
  isActive: boolean;
  modelId: OpenRouterModelId;
  deepBrandSearch: boolean;
  setModelId: (modelId: OpenRouterModelId) => void;
  setDeepBrandSearch: (enabled: boolean) => void;
  saveByok: (apiKey: string, modelId: OpenRouterModelId, deepBrandSearch: boolean) => void;
  clearByok: () => void;
}

const ByokContext = createContext<ByokContextValue | null>(null);

export function ByokProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => loadByokKey());
  const [modelId, setModelIdState] = useState<OpenRouterModelId>(() => loadModel());
  const [deepBrandSearch, setDeepBrandSearchState] = useState<boolean>(() => loadDeepBrandSearch());

  const setModelId = useCallback((nextModelId: OpenRouterModelId) => {
    setModelIdState(nextModelId);
    saveModel(nextModelId);
  }, []);

  const setDeepBrandSearch = useCallback((enabled: boolean) => {
    setDeepBrandSearchState(enabled);
    saveDeepBrandSearch(enabled);
  }, []);

  const saveByok = useCallback((key: string, model: OpenRouterModelId, deepSearch: boolean) => {
    saveByokKey(key);
    setApiKey(key);
    setModelId(model);
    setDeepBrandSearch(deepSearch);
    trackEvent(AnalyticsEvents.BYOK_ENABLED, {
      model_id: model,
      deep_brand_search: deepSearch,
    });
  }, [setModelId, setDeepBrandSearch]);

  const clearByok = useCallback(() => {
    clearByokKey();
    clearDeepBrandSearch();
    setApiKey(null);
    setDeepBrandSearchState(false);
  }, []);

  const value = useMemo(
    () => ({
      apiKey,
      isActive: apiKey !== null,
      modelId,
      deepBrandSearch,
      setModelId,
      setDeepBrandSearch,
      saveByok,
      clearByok,
    }),
    [apiKey, modelId, deepBrandSearch, setModelId, setDeepBrandSearch, saveByok, clearByok],
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
