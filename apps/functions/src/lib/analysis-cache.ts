import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { AnalyzeNameResponse } from "@naamkaran/shared";
import { CACHE_TTL_MS } from "../config/tlds";

interface CachedAnalysis {
  result: AnalyzeNameResponse;
  expiresAt: Timestamp;
}

export async function getCachedAnalysis(
  cacheKey: string,
): Promise<AnalyzeNameResponse | null> {
  try {
    const cacheRef = getFirestore().collection("nameAnalysisCache").doc(cacheKey);
    const cached = await cacheRef.get();
    if (!cached.exists) return null;

    const data = cached.data() as CachedAnalysis;
    if (data.expiresAt.toMillis() > Date.now()) {
      return data.result;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setCachedAnalysis(
  cacheKey: string,
  result: AnalyzeNameResponse,
): Promise<void> {
  try {
    const cacheRef = getFirestore().collection("nameAnalysisCache").doc(cacheKey);
    await cacheRef.set({
      result,
      expiresAt: Timestamp.fromMillis(Date.now() + CACHE_TTL_MS),
    });
  } catch {
    // Firestore is optional — skip cache when unavailable (e.g. API not enabled).
  }
}
