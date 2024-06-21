import { Context } from "@devvit/public-api";
import { generateCloudinaryURL, uploadNonprofitLogo, sleep } from "./imageUtils.js";

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

// Additional resolution classes can be defined similarly.

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