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


//TODO: We ought to only upload a logo if we don't have one already (how to handle the nonprofit changing their logo then? NOTE:)
export async function uploadNonprofitImage(ctx: Context, imageUrl: string): Promise<MediaAsset | null> {
    // Validate image is at URL
    try {
        const request = new Request(imageUrl, {
            method: 'HEAD',
            headers: { Accept: 'application/json' },
        });
        const response = await fetch(request);

        if (response.ok) {
            // console.log("URL exists and is accessible");
            // TODO: at some point take in expected width and compare to Cloudinary result
            return await ctx.media.upload({
                url: imageUrl,
                type: 'image',
            });
        } else {
            console.log(`imageURL is not accessible. Status: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.log(`Image upload failed.`, StringUtil.caughtToString(error));
        return null;
    }
}

export function generateCloudinaryURL(imagePath: string, width: string): string {
    const transformations = `f_auto,c_limit,${width},q_auto`;
    return `https://res.cloudinary.com/everydotorg/image/upload/${transformations}/${imagePath}`;
}

function compareImgWidth(data: Iterable<number>, expectedWidth: number): boolean {
    // data should be result of response.arrayBuffer()
    const uint8Array = new Uint8Array(data);
    let width: number | null = null;

    // Check file signature and read width
    if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
        // JPEG
        width = readJpegWidth(uint8Array);
    } else if (uint8Array[0] === 0x89 && uint8Array[1] === 0x50 && uint8Array[2] === 0x4E && uint8Array[3] === 0x47) {
        // PNG
        width = (uint8Array[16] << 24) | (uint8Array[17] << 16) | (uint8Array[18] << 8) | uint8Array[19];
    } else if (uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46) {
        // GIF
        width = uint8Array[6] | (uint8Array[7] << 8);
    } else {
        console.log(`Cloudinary URL not an image`, StringUtil.caughtToString(e));
        return false;
    }

    if (width !== null) {
        if (width !== expectedWidth) {
            console.log(`Image width does not match. Actual width: ${width}px`);
            return false;
        }
    } else {
        console.log("Unable to determine image width or unsupported format");
        return false;
    }
    return true;
}

function readJpegWidth(data: Uint8Array): number | null {
    let offset = 2;
    while (offset < data.length) {
        if (data[offset] !== 0xFF) return null;
        const marker = data[offset + 1];
        if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) ||
            (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
            return (data[offset + 7] << 8) | data[offset + 8];
        }
        offset += 2 + ((data[offset + 2] << 8) | data[offset + 3]);
    }
    return null;
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
            const result = await uploadNonprofitImage(this.ctx, imageUrl);
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
                const result = await uploadNonprofitImage(this.ctx, imageUrl);
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