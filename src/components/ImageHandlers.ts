import { parse } from 'tldts';
import type { MediaPlugin, MediaAsset } from '@devvit/public-api';

/* Approved Domains */
export const REDD_IT: string = 'redd.it';
export const REDDIT_STATIC: string = 'redditstatic.com';
export const REDDIT_MEDIA: string = 'redditmedia.com';
export const SNOO_DEV: string = 'snoo.dev';
export const EVERY_ORG_CDN: string = 'cloudinary.com';
export const EVERY_ORG: string = 'every.org';

export const APPROVED_DOMAINS: string[] = [REDD_IT, REDDIT_STATIC, REDDIT_MEDIA, EVERY_ORG_CDN];
export const ApprovedDomainsFormatted: string = APPROVED_DOMAINS.map(
  (domain) => `"${domain}"`
).join(', ');

export async function uploadImageToRedditCDN(
  imageUrl: string,
  media: MediaPlugin
): Promise<MediaAsset | string> {
  /**
   * Upload an image to reddit from an approved domain
   */
  const domain = parse(imageUrl).domain;
  if (APPROVED_DOMAINS.includes(domain || '')) {
    return imageUrl;
  }

  let response: MediaAsset = await media.upload({ url: imageUrl, type: 'image' });
  return response;
}

// TODO: MOVE THIS FILE TO UTILS

