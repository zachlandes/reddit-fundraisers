import { parse } from 'tldts';
import type { MediaPlugin } from '@devvit/public-api';


export const REDD_IT: string = 'redd.it';
export const REDDIT_STATIC: string = 'redditstatic.com';
export const REDDIT_MEDIA: string = 'redditmedia.com';
export const SNOO_DEV: string = 'snoo.dev';

export const APPROVED_DOMAINS: string[] = [REDD_IT, REDDIT_STATIC, REDDIT_MEDIA];
export const ApprovedDomainsFormatted: string = APPROVED_DOMAINS.map(
  (domain) => `"${domain}"`
).join(', ');

export const TEST_IMG_URL = "https://res.cloudinary.com/everydotorg/image/upload/c_lfill,w_24,h_24,dpr_2/c_crop,ar_24:24/q_auto,f_auto,fl_progressive/faja_profile/cv57zaekqammaeivuugj";

export async function getRedditImageUrl(imageUrl: string, media: MediaPlugin): Promise<string> {
  // const domain = parse(imageUrl).domain;
  // if (APPROVED_DOMAINS.includes(domain || '')) {
  //   return imageUrl;
  // }

  const { mediaUrl } = await media.upload({ url: imageUrl, type: 'image' });
  return mediaUrl;
}

