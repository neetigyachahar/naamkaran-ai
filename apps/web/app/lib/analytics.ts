import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import type { AiApiErrorCode, AiApiOperation } from "@naamkaran/shared";
import { app } from "./firebase";

let analytics: Analytics | null = null;

const analyticsReady =
  typeof window !== "undefined" && import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    ? isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app);
        }
        return analytics;
      })
    : Promise.resolve(null);

export const AnalyticsEvents = {
  BYOK_ENABLED: "byok_enabled",
  MANUAL_VIABILITY_CHECK: "manual_viability_check",
  NAME_GENERATE: "name_generate",
  SMART_PICK: "smart_pick",
  AI_API_ERROR: "ai_api_error",
} as const;

type AnalyticsEventName = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

type EventParams = Record<string, string | number | boolean | undefined>;

export interface AiApiErrorEventParams {
  operation: AiApiOperation;
  error_code: AiApiErrorCode;
  error_message: string;
  http_status?: number;
  model_id?: string;
  genre_id?: string;
  has_byok?: boolean;
  smart_pick?: boolean;
  deep_brand_search?: boolean;
  name?: string;
  stream_error?: boolean;
}

function logAnalyticsEvent(event: string, params?: EventParams) {
  void analyticsReady.then((instance) => {
    if (!instance) return;
    const cleaned = params
      ? Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined),
        )
      : undefined;
    logEvent(instance, event, cleaned);
  });
}

export function trackEvent(event: AnalyticsEventName, params?: EventParams) {
  logAnalyticsEvent(event, params);
}

export function trackAiApiError(params: AiApiErrorEventParams) {
  logAnalyticsEvent(AnalyticsEvents.AI_API_ERROR, { ...params });
}
