// Learn more at developers.reddit.com/docs
import { Context, Devvit, RichTextBuilder, SettingsClient } from '@devvit/public-api';
import type { Data, JSONObject, MediaAsset, Post } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, RedisKey, type EveryNonprofitInfo } from './types/index.js';
import { createFundraiser, fetchNonprofits, populateNonprofitSelect, fetchFundraiserRaisedDetails } from './sources/Every.js';
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { CachedForm } from './utils/CachedForm.js';
import { TypeKeys } from './utils/typeHelpers.js';
import { fetchPostsToUpdate, setCachedForm, getCachedForm, addOrUpdatePostInRedis, removePostAndFormFromRedis } from './utils/Redis.js';
import { FundraiserPost } from './components/Fundraiser.js';
import { getEveryPublicKey, getEveryPrivateKey } from './utils/keyManagement.js';
import { generateDateOptions } from './utils/dateUtils.js';
import { convertToFormData } from './utils/formUtils.js';
import { existingFundraiserForm } from './forms/ExistingFundraiserForm.js';
import { updateCachedFundraiserDetails, sendFundraiserUpdates } from './utils/renderUtils.js';

Devvit.configure({
  redditAPI: true,
  http: true,
  media: true,
  redis: true,
  realtime: true // Ensure realtime is enabled
});

export function LoadingState(): JSX.Element {
  return (
    <zstack width={'100%'} height={'100%'} alignment="center middle">
      <vstack width={'100%'} height={'100%'} alignment="center middle">
        <text size="large" weight="bold">
          Fundraiser loading...
        </text>
      </vstack>
    </zstack>
  );
}

//Form 1
const searchTermForm = Devvit.createForm(
  () => {
    return {
      fields: [
        { label: 'Search for a nonprofit by name', type: 'string', name: 'searchTerm'}
      ],
      title: 'Create a fundraiser',
      acceptLabel: 'Search',
      cancelLabel: 'Cancel',
    };
  },
  async ({ values }, ctx) => {
    const term = values.searchTerm;
    let everyPublicKey: string | undefined;
    try {
      everyPublicKey = await ctx.settings.get('every-public-api-key');
      if (typeof everyPublicKey === 'string') {
        try {
          const searchResults = await fetchNonprofits(term, everyPublicKey);
          console.log(":::searchResults: \n" + JSON.stringify(searchResults));
          if (searchResults != null) {
            return ctx.ui.showForm(searchSelectForm, convertToFormData(searchResults));
          }
        } catch (error) {
          console.error('Error fetching nonprofits:', error);
          ctx.ui.showToast('Failed to fetch nonprofits. Please try again later.');
        }
      } else {
        throw new Error('The "every-public-api-key" setting is undefined.');
      }
    } catch (e) {
      console.error(`Error getting public key or processing search: ${e}`);
      ctx.ui.showToast('There was an error searching for your term. Please try again later!');
    }
  }
);

// Form 2: submitForm -> *searchSelectForm* -> descriptionForm
const searchSelectForm = Devvit.createForm(
  (data) => {
    const nonprofitSelectOptions = populateNonprofitSelect(JSON.stringify(data));
    return {
      fields: [
        {
          name: 'nonprofit',
          label: 'Select your nonprofit',
          type: 'select',
          options: nonprofitSelectOptions,
        },
      ],
      title: 'Select your nonprofit from the search results',
      acceptLabel: 'Next (description)',
      cancelLabel: 'Cancel'
    };
  },
  async ({values}, ctx) => {
    const {ui} = ctx;
    if (values.nonprofit != null) {
      const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.nonprofit);
      return ui.showForm(submitForm, convertToFormData([nonprofitInfo]));
    }
  }
);

// Form 5 imageForm -> *submitForm*
const submitForm = Devvit.createForm(
  (data) => {
    const endDateOptions = generateDateOptions();
    return {
      fields: [
        { name: 'postTitle', label: 'Post Title', type: 'string' },
        { name: 'formDescription', label: 'Fill in the text of your post here', type: 'paragraph' },
        { name: 'link', label: 'link to donate', type: 'select', options: [
            { label: `${data.nonprofits[0].profileUrl}`, value: JSON.stringify(data.nonprofits[0]) },
          ],
        },
        { name: 'endDate', label: 'End Date', type: 'select', options: endDateOptions },
        { name: 'goal', label: 'Fundraising Goal', type: 'number' },
      ],
      title: 'Confirm your selections and create your post',
      acceptLabel: 'Submit',
      cancelLabel: 'Cancel'
    };
  },
  async ({values}, ctx) => {
    const {reddit} = ctx;
    const currentSubreddit = await reddit.getCurrentSubreddit();
    const postTitle = values.postTitle;
    const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.link);

    // Get Logo ID
    nonprofitInfo.logoCloudinaryId = JSON.parse(values.link).logoCloudinaryId

    const fundraiserInfo = {
      nonprofitID: nonprofitInfo.nonprofitID,
      title: values.postTitle,
      description: values.formDescription,
      startDate: null,
      endDate: new Date(values.endDate),
      goal: values.goal,
      raisedOffline: null,
      //imageBase64: values.imageBase64,
      currency: Currency.USD,
    };
    let publicKey;
    let privateKey;

    try {
      publicKey = await getEveryPublicKey(ctx);
      privateKey = await getEveryPrivateKey(ctx);
    } catch (error) {
      console.error("Error retrieving Every.org API keys:", error);
      ctx.ui.showToast('There was an issue accessing necessary credentials for creating the fundraiser. Please try again later!');
      return;
    }

    let fundraiserCreatedInfo: FundraiserCreationResponse;
    try {
      fundraiserCreatedInfo = await createFundraiser(fundraiserInfo, publicKey, privateKey);
    } catch (error) {
      console.error("Error creating fundraiser:", error);
      ctx.ui.showToast('There was an error creating the fundraiser. Please try again later!');
      return;
    }

    try {
      const post: Post = await reddit.submitPost({
        title: postTitle && postTitle.length > 0 ? postTitle : `${fundraiserCreatedInfo.title} Fundraiser`,
        subredditName: currentSubreddit.name,
        preview: LoadingState()
      });

      const postId = post.id;
      console.log('postId in submit post: ', postId);

      const partialFormToCache = new CachedForm();
      partialFormToCache.initialize(TypeKeys.fundraiserFormFields, {
        formDescription: values.formDescription,
        formTitle: values.postTitle,
        formImageUrl: null
      });
      partialFormToCache.initialize(TypeKeys.everyNonprofitInfo, nonprofitInfo);
      partialFormToCache.initialize(TypeKeys.fundraiserCreationResponse, fundraiserCreatedInfo);
      console.log('Form to be cached:', partialFormToCache.serializeForRedis());
      try {
        await setCachedForm(ctx, postId, partialFormToCache);
        await addOrUpdatePostInRedis(ctx.redis, post.id, new Date(values.endDate));
      } catch (error) {
        console.error('Error during Redis operations:', error);
        ctx.ui.showToast('Failed to save the post. Please try again.');

        // Attempt to clean up by removing any potentially partially written data
        try {
          await removePostAndFormFromRedis(ctx.redis, postId);
        } catch (cleanupError) {
          console.error('cleanupError: Failed to clean up Redis data:', cleanupError);
        }

        // Attempt to delete the Reddit post to avoid orphaned posts
        try {
          await ctx.reddit.remove(postId, false);
        } catch (removePostError) {
          console.error('removePostError: Failed to remove the Reddit post:', removePostError);
          ctx.ui.showToast('There was an issue creating your fundraiser post. Please delete the post manually and try again.');
        }

        return; 
      }
      ctx.ui.navigateTo(post)
    } catch (error) {
      console.error('Error during post submission:', error);
      ctx.ui.showToast('Failed to submit the post. Please try again later.');
    }
  }
)

// TODO: Uncomment this when we are ready to launch creating fundraisers with forms
// Devvit.addMenuItem({
//   label: 'Create a new fundraiser',
//   location: 'subreddit',
//   forUserType: 'moderator',
//   onPress: async (_event, { ui }) => {
//     return ui.showForm(searchTermForm);
//   },
// });

Devvit.addMenuItem({
  label: 'Create a post from an existing fundraiser',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, { ui }) => {
    return ui.showForm(existingFundraiserForm);
  },
});

Devvit.addCustomPostType(FundraiserPost);

Devvit.addSettings([
  {
    name: 'every-public-api-key',
    label: 'Every.org public api key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
  {
    name: 'every-private-api-key',
    label: 'Every.org private api key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

Devvit.addSchedulerJob({
  name: 'update_fundraiser_posts',
  onRun: async (_, context) => {
    const redis = context.redis;
    let postsToUpdate;
    try {
      postsToUpdate = await fetchPostsToUpdate(redis);
    } catch (error) {
      console.error('Error fetching posts to update:', error);
      return;
    }

    for (const postId of postsToUpdate) {
      let postExists;
      try {
        postExists = await context.reddit.getPostById(postId);
      } catch (error) {
        console.error(`Error retrieving post by ID ${postId}:`, error);
        continue;
      }

      if (!postExists) {
        console.log(`Post with ID ${postId} not found, skipping update.`);
        continue;
      }

      let cachedForm;
      try {
        cachedForm = await getCachedForm(context, postId);
      } catch (error) {
        console.error(`Error retrieving cached form for postId: ${postId}`, error);
        continue;
      }

      if (!cachedForm) {
        console.error(`No cached form found for postId: ${postId}`);
        continue;
      }

      let fundraiserInfo = cachedForm.getAllProps(TypeKeys.everyExistingFundraiserInfo);
      let fundraiserRaisedDetails = cachedForm.getAllProps(TypeKeys.fundraiserDetails);
      let updatedDetails;
      try {
        updatedDetails = await fetchFundraiserRaisedDetails(
          fundraiserInfo.nonprofitId,
          fundraiserInfo.id,
          await getEveryPublicKey(context),
          context
        );
      } catch (error) {
        console.error(`Error fetching fundraiser raised details for postId: ${postId}`, error);
        continue;
      }

      if (updatedDetails) {
        let changes = [];
        if (updatedDetails.raised !== fundraiserRaisedDetails.raised) {
          changes.push(`Raised: ${updatedDetails.raised}`);
        }
        if (updatedDetails.goalAmount !== fundraiserRaisedDetails.goalAmount) {
          changes.push(`Goal: ${updatedDetails.goalAmount}`);
        }
        if (changes.length > 0) {
          try {
            await updateCachedFundraiserDetails(context, postId, updatedDetails, fundraiserRaisedDetails);
            await sendFundraiserUpdates(context, postId, updatedDetails);
            console.log(`Updated Details for post: ${postId}, ${changes.join(', ')}`);
          } catch (error) {
            console.error(`Error updating cached details or sending updates for postId: ${postId}`, error);
          }
        }
      }
    }
  },
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    try {
      await context.scheduler.runJob({
        cron: '*/10 * * * * *',
        name: 'update_fundraiser_posts',
      });
    } catch (e) {
      console.error('Error scheduling update_fundraiser_posts job on app install:', e);
      throw e;
    }
  },
});

Devvit.addTrigger({
  event: 'AppUpgrade',
  onEvent: async (_, context) => {
    const jobs = await context.scheduler.listJobs();
    const updateJobs = jobs.filter((job) => job.name === 'update_fundraiser_posts');
    if (updateJobs.length > 1) {
      console.log(`Found ${updateJobs.length} update jobs, canceling all but the first one`);
      for (let i = 1; i < updateJobs.length; i++) {
        await context.scheduler.cancelJob(updateJobs[i].id);
      }
    } else if (updateJobs.length === 0) {
      console.log('No update job found on app upgrade, scheduling a new one');
      await context.scheduler.runJob({
        cron: '*/10 * * * * *',
        name: 'update_fundraiser_posts',
      });
    } else {
      console.log('Update scheduler job validated.');
    }
  },
});

Devvit.addTrigger({
  event: 'PostDelete',
  onEvent: async (event, context) => {
    const { redis } = context;
    const postId = event.postId;

    // Remove the post from Redis
    await removePostAndFormFromRedis(redis, postId);

    // Remove the fundraiser-raised-amount key associated with the post (only relevant to mockforms)
    const fundraiserKey = `fundraiser-raised-amount-${postId}`;
    await redis.del(fundraiserKey);

    console.log(`Deleted Redis key: ${fundraiserKey} for postId: ${postId}`);
  },
});

export default Devvit;