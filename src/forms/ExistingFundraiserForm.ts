import { Devvit } from "@devvit/public-api";
import { fetchExistingFundraiserDetails, fetchFundraiserRaisedDetails } from "../sources/Every.js";
import { CachedForm } from "../utils/CachedForm.js";
import { addOrUpdatePostInRedis, setCachedForm, removePostAndFormFromRedis } from "../utils/Redis.js";
import { LoadingState } from "../main.js";
import { fundraiserUrlHelper } from "../utils/formUtils.js";
import { EveryFundraiserRaisedDetails } from '../types/index.js'; // Added import for EveryFundraiserRaisedDetails
import { ImageManager } from "../utils/imageUtils.js";

// Create a custom post from an existing fundraiser on every.org
const DEBUG_IMAGE = true;

export const existingFundraiserForm = Devvit.createForm(
    () => {
        return {
          fields: [
            { label: 'Give a title to your post',
            type: 'string',
            name: 'postTitle',
            helpText: "Give your Reddit post a clear and engaging title, e.g. [CALL TO ACTION] Pet Lovers - Donate to 'Lil Bub's Big Fund and the r/petlovers mod team will match your donation, up to $5,000 total "},
            { label: 'Enter the url of an existing fundraiser from every.org',
            type: 'string',
            name: 'fundraiserUrl',
            helpText: "The URL should look like this: https://every.org/nonprofit-name/f/fundraiser-name. Go to every.org to create or find a fundraiser, first."}
          ],
          title: 'Create a fundraiser',
          acceptLabel: 'Create',
          cancelLabel: 'Cancel',
        };
      },
      async ({ values }, ctx) => {
        const{ reddit } = ctx;
        
        let nonprofitIdentifier: string;
        let fundraiserIdentifier: string;
        try {
            ({nonprofitIdentifier, fundraiserIdentifier} = fundraiserUrlHelper(values.fundraiserUrl));
        } catch (e) {
            console.error(`Error parsing URL: ${e instanceof Error ? e.message : e}`);
            ctx.ui.showToast('Invalid URL. Please ensure it is correctly formatted.');
            return;
        }
        
        let everyPublicKey: string | undefined;
        try {
            everyPublicKey = await ctx.settings.get('every-public-api-key');
        } catch (e) {
            console.error(`Error retrieving API key: ${e instanceof Error ? e.message : e}`);
            ctx.ui.showToast('Unable to process your request due to a configuration issue. Please try again later.');
            return;
        }

        if (!everyPublicKey) {
            console.error('API key not configured in settings.');
            ctx.ui.showToast('Unable to process your request due to missing configuration. Please try again later.');
            return;
        }

        try { //TODO: simplify / centralize exception handling
            const existingFundraiserDetails = await fetchExistingFundraiserDetails(nonprofitIdentifier, fundraiserIdentifier, everyPublicKey);
            if (!existingFundraiserDetails) {
                ctx.ui.showToast('Failed to fetch fundraiser details. Please check the URL and try again.');
                return;
            }

            if (DEBUG_IMAGE) {
                const coverImageId = existingFundraiserDetails.fundraiserInfo.coverImageCloudinaryId;
                if (typeof coverImageId === 'string') {
                    console.log(`[ExistingFundraiserForm] Cover image cloudinary ID:`, coverImageId);
                } else {
                    console.log(`[ExistingFundraiserForm] Cover image cloudinary ID is null`);
                }
            }

            const fundraiserRaisedDetails = await fetchFundraiserRaisedDetails(nonprofitIdentifier, fundraiserIdentifier, everyPublicKey, ctx);
            if (!fundraiserRaisedDetails) {
                ctx.ui.showToast('Failed to fetch fundraiser raised details. Please check the URL and try again.');
                return;
            }

            const postTitle = values.postTitle || `${existingFundraiserDetails.fundraiserInfo.title} Fundraiser`; //TODO:  Not necessary if user must submit nonempty title field. Check if this is the case.
            let currentSubreddit;
            try {
                currentSubreddit = await reddit.getCurrentSubreddit();
            } catch (error) {
                console.error('Failed to get current subreddit:', error);
                ctx.ui.showToast('Failed to retrieve current subreddit. Please try again.');
                return;
            }
            let post;
            try {
                post = await reddit.submitPost({
                    title: postTitle,
                    subredditName: currentSubreddit.name,
                    preview: LoadingState()
                });
            } catch (error) {
                console.error('Failed to submit post:', error);
                ctx.ui.showToast('Failed to submit post. Please try again.');
                return;
            }

            const postId = post.id;
            console.log('postId in submit post: ', postId);

            // Cache the fetched details
            const cachedForm = new CachedForm();
            cachedForm.initialize('everyExistingFundraiserInfo', existingFundraiserDetails.fundraiserInfo);
            cachedForm.initialize('everyNonprofitInfo', existingFundraiserDetails.nonprofitInfo);
            cachedForm.initialize('fundraiserDetails', fundraiserRaisedDetails);

            const imageManager = new ImageManager(ctx);
            let coverImageUrl: string | null = null;
            let logoImageUrl: string | null = null;

            const coverImageWidth = 1200; // FIXME: I think we want to create multiple width cover images but responsively serve them based on viewport width

            const coverImagePath = existingFundraiserDetails.fundraiserInfo.coverImageCloudinaryId ?? null;
            const logoImagePath = existingFundraiserDetails.nonprofitInfo.logoCloudinaryId ?? null;

            if (coverImagePath !== null) {
                try {
                    if (DEBUG_IMAGE) console.log(`[ExistingFundraiserForm] Attempting to get cover image URL for: ${coverImagePath}`);
                    coverImageUrl = await imageManager.getImageUrl(coverImagePath, coverImageWidth);
                    if (DEBUG_IMAGE) console.log(`[ExistingFundraiserForm] Retrieved cover image URL: ${coverImageUrl}`);
                    cachedForm.setProp('everyExistingFundraiserInfo', 'coverImageCloudinaryId', coverImageUrl);
                } catch (error) {
                    console.error(`Failed to retrieve cover image for postId: ${postId}`, error);
                }
            } else {
                if (DEBUG_IMAGE) console.log(`[ExistingFundraiserForm] No cover image path found for postId: ${postId}`);
            }

            if (logoImagePath !== null) {
                try {
                    if (DEBUG_IMAGE) console.log(`[ExistingFundraiserForm] Attempting to get logo URL for: ${logoImagePath}`);
                    logoImageUrl = await imageManager.getLogoUrl(logoImagePath);
                    if (DEBUG_IMAGE) console.log(`[ExistingFundraiserForm] Retrieved logo URL: ${logoImageUrl}`);
                    cachedForm.setProp('everyNonprofitInfo', 'logoCloudinaryId', logoImageUrl);
                } catch (error) {
                    console.error(`Failed to retrieve logo image for postId: ${postId}`, error);
                }
            }

            try {
                await setCachedForm(ctx, postId, cachedForm);
                await addOrUpdatePostInRedis(ctx.redis, post.id, existingFundraiserDetails.fundraiserInfo.endDate ? new Date(existingFundraiserDetails.fundraiserInfo.endDate) : null);
                ctx.ui.navigateTo(post);
            } catch (error) {
                console.error('Error setting cached form:', error);
                ctx.ui.showToast('An error occurred while caching the form. Please try again.');

                // Attempt to delete the post since caching failed
                try {
                    await reddit.remove(postId, false);
                    ctx.ui.showToast('Unable to create the fundraiser due to a temporary issue. Please try again.');
                } catch (removeError) {
                    console.error('Failed to remove post:', removeError);
                    ctx.ui.showToast('There was an issue creating your fundraiser post. Please delete the post and try again.');
                }

                // Attempt to clean up by removing any potentially partially written data in Redis
                try {
                    await removePostAndFormFromRedis(ctx.redis, postId);
                } catch (cleanupError) {
                    console.error('Failed to clean up Redis data:', cleanupError);
                }
                return;
            }
        } catch (error) {
            console.error('Error fetching or caching fundraiser details:', error);
            ctx.ui.showToast('An error occurred while processing your request. Please try again.');
        }
      }
)