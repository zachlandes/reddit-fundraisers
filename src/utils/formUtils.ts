import { EveryNonprofitInfo } from "../types/index.js";

export function convertToFormData(
    nonprofits: EveryNonprofitInfo[] | null
  ): { nonprofits: EveryNonprofitInfo[] } {
    return {
      nonprofits: nonprofits ?? [],
    };
  }