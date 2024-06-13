import { Context, MediaAsset } from '@devvit/public-api';
import { StringUtil } from '@devvit/shared-types/StringUtil.js';

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


//FIXME: We ought to only upload a logo if we don't have one already (how to handle the nonprofit changing their logo then?)
export async function uploadNonprofitLogo(ctx: Context, imageUrl: string): Promise<MediaAsset | null> {
    try {
        return await ctx.media.upload({
            url: imageUrl,
            type: 'image',
        });
    } catch (e) {
        console.log(StringUtil.caughtToString(e));
        console.log('Image upload failed.');
        console.log(`Please use images from ${ApprovedDomainsFormatted}.`);
        return null;
    }
}
