import { EveryNonprofitInfo } from "../types/index.js";

export function convertToFormData(
    nonprofits: EveryNonprofitInfo[] | null
  ): { nonprofits: EveryNonprofitInfo[] } {
    return {
      nonprofits: nonprofits ?? [],
    };
  }

  /**
 * Validates and extracts identifiers from a fundraiser URL.
 * Expected URL format: https://every.org/nonprofit-name/f/fundraiser-name
 * 
 * @param {string} url - The URL to validate and parse.
 * @returns { {nonprofitIdentifier: string, fundraiserIdentifier: string} }
 * @throws {Error} If the URL is invalid or does not match the expected format.
 */
export function fundraiserUrlHelper(url: string): { nonprofitIdentifier: string; fundraiserIdentifier: string } {
  try {
      const parsedUrl = new URL(url);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      if (!(parsedUrl.hostname === 'every.org' || parsedUrl.hostname === 'www.every.org') || pathSegments.length !== 3 || pathSegments[1] !== 'f') {
          throw new Error('URL format is incorrect. Please use the format: https://every.org/nonprofit-name/f/fundraiser-name');
      }

      const nonprofitIdentifier = pathSegments[0];
      const fundraiserIdentifier = pathSegments[2];

      return { nonprofitIdentifier, fundraiserIdentifier };
  } catch (error) {
      if (error instanceof TypeError) {
          throw new Error('Invalid URL. Please ensure it is correctly formatted.');
      }
      throw error;
  }
}