// Learn more at developers.reddit.com/docs
import { Context, Devvit, RichTextBuilder, SettingsClient } from '@devvit/public-api';
import type { Data, JSONObject, MediaAsset, Post } from '@devvit/public-api';
import type { EveryNonprofitInfo } from './types/index.js';
import { fetchNonprofits, populateNonprofitSelect } from './sources/Every.js';
import { ApprovedDomainsFormatted, uploadImageToRedditCDN} from './components/ImageHandlers.js'
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { CachedForm } from './utils/CachedForm.js';
import { TypeKeys } from './utils/typeHelpers.js';
import { getCachedForm, setCachedForm } from './utils/Redis.js';
import { FundraiserPost } from './components/Fundraiser.js';

Devvit.configure({
  redditAPI: true,
  http: true,
  media: true,
  redis: true
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

// this could be simplified if we only convert cachedForms, and cachedForms can encode EveryNonprofitInfo.
// TODO: break into a class with multiple conversion methods
function convertToFormData(
  nonprofits: EveryNonprofitInfo[] | null
): { nonprofits: EveryNonprofitInfo[] } {
  return {
    nonprofits: nonprofits ?? [],
  };
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
    try {
      const everyPublicKey: string | undefined = await ctx.settings.get('every-public-api-key');
    } catch (e) {
      console.error(e)
      ctx.ui.showToast('There was an error searching for your term. Please try again later!')
    }
    const everyPublicKey: string | undefined = await ctx.settings.get('every-public-api-key');

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
    return {
      fields: [
        {
          name: 'nonprofit',
          label: 'Select your nonprofit',
          type: 'select',
          options: populateNonprofitSelect(JSON.stringify(data)).map((nonprofit: EveryNonprofitInfo) => ({
            label: `${nonprofit.name}`,
            value: JSON.stringify(nonprofit),
          })),
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
    console.log(data.nonprofits);
    return {
      fields: [
        { name: 'postTitle', label: 'Post Title', type: 'string' },
        { name: 'formDescription', label: 'Fill in the text of your post here', type: 'paragraph' },
        { name: 'link', label: 'link to donate', type: 'select', options: [
            { label: `${data.nonprofits[0].profileUrl}`, value: JSON.stringify(data.nonprofits[0]) },
          ],
        },
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

    // const myrichtext = new RichTextBuilder()
    //   .paragraph((p) => {
    //     p.text({
    //       text: String(values.formDescription)
    //     }).link({
    //       text: "Donate",
    //       url: String(values.link),
    //       tooltip: "Go to the every.org donate page"
    //     });
    //   })
    //   .build();

    const post: Post = await reddit.submitPost({
      title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser`,
      subredditName: currentSubreddit.name,
      preview: LoadingState()
    });
    const postId = post.id;
    console.log('postId in submit post: ', postId);
    console.log("values in submit post: ", values);

    const partialFormToCache = new CachedForm();
    partialFormToCache.initialize(TypeKeys.fundraiserFormFields, {
      formDescription: values.formDescription,
      formTitle: values.postTitle,
      formImageUrl: null
    });
    partialFormToCache.initialize(TypeKeys.everyNonprofitInfo, JSON.parse(values.link));
    console.log('Form to be cached:', partialFormToCache.serializeForRedis());
    await setCachedForm(ctx, postId, partialFormToCache);
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
  //   name: "Fundraiser",
  //   render: (context) => {
  //     //const { useState, postId } = context;
  //     // console.log(JSON.stringify({'addCustomPostTypeContext': context}));
  //     return (
  //       <blocks height="regular">
  //         <vstack>
  //           <text style="heading" size="xxlarge">
  //             Fundraiser created! 2
  //           </text>
  //           <button icon="heart" appearance="primary" />
  //           <text style="paragraph" size="small">
  //           </text>
  //         </vstack>
  //       </blocks>
  //     );
  //   }
  // });

Devvit.addSettings([
  {
    name: 'every-public-api-key',
    label: 'Every.org public api key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

import { updateFundraiserPost } from './utils/PostUpdater.js'; //FIXME: implement this function to update the post

Devvit.addSchedulerJob({
  name: 'update_fundraiser_subscriptions',
  onRun: async (_, context) => {
    const allSubscriptionsKey = "ALL_SUBSCRIPTIONS";
    const postIds = (await context.redis.zRange(allSubscriptionsKey, 0, -1)).map(item => item.member); // Assuming the API returns an array of { member, score }
    if (postIds.length > 0) {
      for (const postId of postIds) {
        try {
          const cachedForm = await getCachedForm(context, postId);
          if (cachedForm) {
            const fundraiserInfo = cachedForm.getAllProps(TypeKeys.fundraiserDetails);
            if (fundraiserInfo) {
              await updateFundraiserPost(context, postId, fundraiserInfo);
            } else {
              console.error(`No fundraiser details found for form with key: ${postId}`);
            }
          } else {
            console.error(`No cached form found for key: ${postId}`);
          }
        } catch (error) {
          console.error(`Error retrieving form for key ${postId}: `, error);
        }
      }
    }
  },
});

export default Devvit;


// // Form 3 searchSelectForm -> *descriptionForm* -> imageForm
// //FIXME: Skipping for now. I need this is buggy, too.
// const descriptionForm = Devvit.createForm( //TODO: unfinished
//   () => {
//     return {
//       fields: [
//         { label: `Fill in the text of your post here`,
//         type: 'paragraph',
//         name: 'description'}
//       ],
//       title: 'Describing Your Fundraiser',
//       acceptLabel: 'Next (post preview)',//'Next (image upload)',
//       cancelLabel: 'Cancel'
//     }
//   },
//   async ({values}, ctx) => {
//     if (values.description != null) {
//       let cachedDescriptionForm; // Declare outside the try block
//       try {
//         const key = await createUserSubredditHashKey(ctx);
//         cachedDescriptionForm = await returnCachedFormAsJSON<EveryNonprofitInfo, FundraiserFormFields>(ctx, key);
//         if (cachedDescriptionForm != null) {
//           cachedDescriptionForm.setFormField('formDescription', values.description);
//           console.log("cachedDescriptionForm: ", cachedDescriptionForm);
//         } else {
//           throw new Error("Cached form is null");
//         }
//       } catch (error) {
//         console.error('Failed to get userSubreddit Key or set form in redis:', error);
//         ctx.ui.showToast("There was an error, please try again later!");
//       }
//       if (cachedDescriptionForm) {
//         const nonprofitInfoArray = [cachedDescriptionForm.getAllNonprofitProps()]; 
//         return ctx.ui.showForm(submitForm, convertToFormData(nonprofitInfoArray));
//       }
//     }
//   }
// );
//   async ({ values }, ctx) => {
//     const {reddit} = ctx;
//     const currentSubreddit = await reddit.getCurrentSubreddit();
//     const postTitle = values.postTitle;
//     const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.nonprofit) as EveryNonprofitInfo;
//     console.log(postTitle + " ::::LOGO::: " + JSON.stringify(nonprofitInfo.logoUrl));

//     const imageUrl: string | null = nonprofitInfo.logoUrl;
//     let response: MediaAsset;

//     try {
//       response = await ctx.media.upload({
//         url: imageUrl,
//         type: 'image',
//       });
//     } catch (e) {
//       console.log(StringUtil.caughtToString(e));
//       console.log('Image upload failed.');
//       console.log(`Please use images from ${ApprovedDomainsFormatted}.`);
//       return;
//     }

//     const myrichtext = new RichTextBuilder()
//       .paragraph((p) => {
//         p.text({
//           text: nonprofitInfo.description
//         }).text({
//           text: "secondChild"
//         });
//       }).image({
//         mediaId: response.mediaId
//       })
//       .build();
//     // console.log(myrichtext)

//     const post: Post = await reddit.submitPost({
//       //preview: LoadingState(),
//       title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser`,
//       subredditName: currentSubreddit.name,
//       richtext: myrichtext,
//     });
//  }
//);

  // // Form 4 descriptionForm -> *imageForm* -> submitForm
  // //FIXME: Skipping for now
  // const imageForm = Devvit.createForm( //TODO: implement when image uploads are launched
  //   (data) => {
  //     return {
  //       fields: [
  //         { name: 'image',
  //         label: 'Select a different image',
  //         type: 'string',
  //         }
  //       ],
  //       title: 'Selecting an Image For Your Post',
  //       acceptLabel: 'Next (post preview)',
  //       cancelLabel: 'Cancel'
  //     }
  //   },
  //   async ({values}, ctx) => {
  //     return ctx.ui.showForm(submitForm, values);
  //   }
  // )
