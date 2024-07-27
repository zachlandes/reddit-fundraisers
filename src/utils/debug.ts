import { Devvit } from '@devvit/public-api';

export enum DEBUG_AREAS {
  IMAGE = 'image',
  REDIS = 'redis',
  FORM = 'form',
  API = 'api',
  // Add more areas as needed
};

type PartialContext = Partial<Devvit.Context>;

export async function isDebugEnabled(area: DEBUG_AREAS, context: PartialContext): Promise<boolean> {
  if (!context.reddit || !context.settings) return false;

  const subreddit = await context.reddit.getCurrentSubreddit();
  if (!subreddit) return false;

  const debugKey = `DEBUG_r_${subreddit}`;
  const subredditDebug = await context.settings.get(debugKey);
  
  if (subredditDebug === 'true') {
    const areaDebugKey = `DEBUG_${area.toUpperCase()}_r_${subreddit}`;
    const areaDebug = await context.settings.get(areaDebugKey);
    return areaDebug !== 'false';
  }
  
  return false;
}

export async function debugLog(area: DEBUG_AREAS, context: PartialContext, message: string, ...args: any[]): Promise<void> {
  if (await isDebugEnabled(area, context)) {
    console.log(`[DEBUG:${area}] ${message}`, ...args);
  }
}