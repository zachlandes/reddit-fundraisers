// Learn more at developers.reddit.com/docs
import { Context, Devvit, RichTextBuilder, SettingsClient } from '@devvit/public-api';
import type { Data, JSONObject, MediaAsset, Post } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, RedisKey, type EveryNonprofitInfo } from './types/index.js';
import { createFundraiser, fetchNonprofits, populateNonprofitSelect, fetchFundraiserRaisedDetails } from './sources/Every.js';
import { ApprovedDomainsFormatted, uploadImageToRedditCDN} from './components/ImageHandlers.js'
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { CachedForm } from './utils/CachedForm.js';
import { TypeKeys } from './utils/typeHelpers.js';
import { fetchPostsToUpdate, removePostFromRedis, setCachedForm, getCachedForm, addOrUpdatePostInRedis } from './utils/Redis.js';
import { FundraiserPost } from './components/Fundraiser.js';
import { getEveryPublicKey, getEveryPrivateKey } from './utils/keyManagement.js';
import { generateDateOptions } from './utils/dateUtils.js';
import { convertToFormData } from './utils/formUtils.js';

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
        { label: 'Search for a nonprofit by name',
        type: 'string',
        name: 'searchTerm'}
      ],
      title: 'Create a fundraiser',
      acceptLabel: 'Search',
      cancelLabel: 'Cancel',
    };
  },
  async ({ values }, ctx) => {
    const term = values.searchTerm
    let everyPublicKey: string | undefined;
    try {
      everyPublicKey = await ctx.settings.get('every-public-api-key');
    } catch (e) {
      console.error(e)
      ctx.ui.showToast('There was an error searching for your term. Please try again later!')
    }
    if (typeof everyPublicKey === 'string') {
      const searchResults = await fetchNonprofits(term, everyPublicKey) //TODO: catch null returns
      console.log(":::searchResults: \n" + JSON.stringify(searchResults));
      if (typeof searchResults != null) {return ctx.ui.showForm(searchSelectForm, convertToFormData(searchResults));}
    }
    else {
      console.error('The "every-public-api-key" setting is undefined. Unable to fetch nonprofits.');
      ctx.ui.showToast('There was an error searching for your term. Please try again later!')
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
      console.log(values.nonprofit)
      const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.nonprofit);
      return ui.showForm(submitForm, convertToFormData([nonprofitInfo]));
    }
  }
);

// Form 5 imageForm -> *submitForm*
const submitForm = Devvit.createForm(
  (data) => {
    const endDateOptions = generateDateOptions();
    console.log(data.nonprofits);
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
    console.log(values.formDescription);

    const fundraiserInfo = {
      nonprofitID: JSON.parse(values.link).nonprofitId,
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
    partialFormToCache.initialize(TypeKeys.everyNonprofitInfo, JSON.parse(values.link));
    partialFormToCache.initialize(TypeKeys.fundraiserCreationResponse, fundraiserCreatedInfo);
    console.log('Form to be cached:', partialFormToCache.serializeForRedis());
    await setCachedForm(ctx, postId, partialFormToCache);
    await addOrUpdatePostInRedis(ctx.redis, post.id, new Date(values.endDate)); //FIXME: add try catch
    ctx.ui.navigateTo(post)
  }
)

Devvit.addMenuItem({
  label: 'Create a fundraiser',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, { ui }) => {
    return ui.showForm(searchTermForm);
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
    const postsToUpdate = await fetchPostsToUpdate(redis);
    for (const postId of postsToUpdate) {
      const postExists = await context.reddit.getPostById(postId);
      if (!postExists) {
        console.log(`Post with ID ${postId} not found, skipping update.`);
        continue;
      }
      const cachedForm = await getCachedForm(context, postId);
      if (!cachedForm) {
        console.error(`No cached form found for postId: ${postId}`);
        continue;
      }
      const fundraiserInfo = cachedForm.getAllProps(TypeKeys.fundraiserCreationResponse);
      console.log('Nonprofit ID for getting new raised amount:', fundraiserInfo.nonprofitId);
      console.log('Fundraiser ID for getting new raised amount:', fundraiserInfo.id);
      const updatedDetails = await fetchFundraiserRaisedDetails(
        fundraiserInfo.nonprofitId,
        fundraiserInfo.id,
        await getEveryPublicKey(context),
        context
      );
      console.log("Updated Details:", updatedDetails?.raised);
      if (updatedDetails && updatedDetails.raised !== fundraiserInfo.amountRaised) {
        // Update only the amountRaised in the cached form
        console.log("Updating the cached form amount raised for postId: " + postId);
        cachedForm.setProp(TypeKeys.fundraiserCreationResponse, 'amountRaised', updatedDetails.raised);
        await setCachedForm(context, postId, cachedForm);
        console.log(`For ${postId} there is a new raised amount: ${updatedDetails.raised}`);
        // Send only the postId and the updated amountRaised to the real-time channel
        await context.realtime.send('fundraiser_updates', {
          postId: postId,
          raised: updatedDetails.raised
        });
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
        data: {},
      });
    } catch (e) {
      console.error('Error scheduling job on app install:', e);
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
        data: {},
      });
    } else {
      console.log('Scheduler job validated.');
    }
  },
});

Devvit.addTrigger({
  event: 'PostDelete',
  onEvent: async (event, context) => {
    const { redis } = context;
    await removePostFromRedis(redis, event.postId);
  },
});

export default Devvit;
