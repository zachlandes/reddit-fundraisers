import { Devvit } from "@devvit/public-api";
import { fetchExistingFundraiserDetails } from "../sources/Every.js";
import { CachedForm } from "../utils/CachedForm.js";
import { addOrUpdatePostInRedis, setCachedForm } from "../utils/Redis.js";
import { LoadingState } from "../main.js";
import { fundraiserUrlHelper } from "../utils/formUtils.js";
import { EveryFundraiserRaisedDetails } from '../types/index.js'; // Added import for EveryFundraiserRaisedDetails

// Create a custom post from an existing fundraiser on every.org
export const existingFundraiserForm = Devvit.createForm(
    () => {
        return {
          fields: [
            { label: 'Enter the url of an existing fundraiser from every.org',
            type: 'string',
            name: 'fundraiserUrl',
            helpText: "The URL should look like this: https://every.org/nonprofit-name/f/fundraiser-name"},
            { label: 'Give a title to your post',
            type: 'string',
            name: 'postTitle'}
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
            const emptyFundraiserRaisedDetails: EveryFundraiserRaisedDetails = {
                currency: existingFundraiserDetails.fundraiserInfo.goalCurrency,
                raised: 0,
                supporters: 0,
                goalAmount: existingFundraiserDetails.fundraiserInfo.goalAmount,
                goalType: "n/a"
            };
            cachedForm.initialize('fundraiserDetails', emptyFundraiserRaisedDetails);
            try {
                await setCachedForm(ctx, postId, cachedForm);
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
                return;
            }
            await addOrUpdatePostInRedis(ctx.redis, post.id, existingFundraiserDetails.fundraiserInfo.endDate ? new Date(existingFundraiserDetails.fundraiserInfo.endDate) : null);
            ctx.ui.navigateTo(post);
        } catch (error) {
            console.error('Error fetching or caching fundraiser details:', error);
            ctx.ui.showToast('An error occurred while processing your request. Please try again.');
        }
      }
)
