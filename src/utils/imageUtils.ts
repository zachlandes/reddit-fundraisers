import { Context, MediaAsset } from '@devvit/public-api';
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { ApprovedDomainsFormatted } from './ImageHandlers.js';

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