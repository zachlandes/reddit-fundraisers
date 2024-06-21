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

export function generateCloudinaryURL(imagePath: string, width: string): string {
    const transformations = `f_auto,c_limit,${width},q_auto`;
    return `https://res.cloudinary.com/everydotorg/image/upload/${transformations}/${imagePath}`;
}

export function sleep(ms: number) : Promise<void>{
    return new Promise (resolve => {
        var startTime = Date.now()
        while ((Date.now() - startTime) < ms)
        {
            // do nothing
        }
        resolve()
    })
}

interface ImageResolution {
    width: number;
    generateUrl(cloudinaryId: string): string;
}

class MobileImage implements ImageResolution {
    width = 640;
    generateUrl(cloudinaryId: string): string {
        return generateCloudinaryURL(cloudinaryId, 'w_640');
    }
}

class DesktopImage implements ImageResolution {
    width = 1200;
    generateUrl(cloudinaryId: string): string {
        return generateCloudinaryURL(cloudinaryId, 'w_1200');
    }
}

export class ImageManager {
    private logoWidth = 45; // Fixed width for logos
    private resolutions: ImageResolution[] = [new MobileImage(), new DesktopImage()]; // For responsive images

    constructor(private ctx: Context) {}

    // Method for fixed-size images like logos
    async getLogoUrl(cloudinaryId: string): Promise<string | null> {
        const cacheKey = `logo:${cloudinaryId}`;
        let cachedUrl = await this.ctx.redis.get(cacheKey);
        if (!cachedUrl) {
            const imageUrl = generateCloudinaryURL(cloudinaryId, `w_${this.logoWidth}`);
            const result = await uploadNonprofitLogo(this.ctx, imageUrl);
            if (result && result.mediaUrl) {
                // Sleep before caching the URL to deal with time reddit takes to make an image available
                await sleep(3000);
                await this.ctx.redis.set(cacheKey, result.mediaUrl);
                cachedUrl = result.mediaUrl;
            }
        }
        return cachedUrl ? cachedUrl : null;
    }

    // Method to handle responsive images
    async getImageUrl(cloudinaryId: string, viewportWidth: number): Promise<string | null> {
        // Check Redis for each resolution
        for (const resolution of this.resolutions) {
            const cacheKey = `${cloudinaryId}:${resolution.width}`;
            const cachedUrl = await this.ctx.redis.get(cacheKey);
            if (!cachedUrl) {
                // If not cached, generate URL and upload
                const imageUrl = resolution.generateUrl(cloudinaryId);
                const result = await uploadNonprofitLogo(this.ctx, imageUrl);
                if (result && result.mediaUrl) {
                    // Sleep before caching the URL to deal with time reddit takes to make an image available
                    await sleep(3000);
                    await this.ctx.redis.set(cacheKey, result.mediaUrl);
                }
            }
        }

        // Retrieve the appropriate image URL for the given viewport width
        return this.selectImageUrlForViewport(cloudinaryId, viewportWidth);
    }

    private async selectImageUrlForViewport(cloudinaryId: string, viewportWidth: number): Promise<string | null> {
        const suitableResolution = this.resolutions.find(res => res.width >= viewportWidth) || this.resolutions[this.resolutions.length - 1];
        const cacheKey = `${cloudinaryId}:${suitableResolution.width}`;
        const cachedUrl = await this.ctx.redis.get(cacheKey);
        return cachedUrl ? cachedUrl : null;
    }
}