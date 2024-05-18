// Learn more at developers.reddit.com/docs
import { Context, Devvit, RichTextBuilder, SettingsClient } from '@devvit/public-api';
import type { JSONObject, MediaAsset, Post } from '@devvit/public-api';
import type { EveryNonprofitInfo, GeneralNonprofitInfo } from './sources/Every.js';
import { fetchNonprofits, populateNonprofitSelect } from './sources/Every.js';
import { ApprovedDomainsFormatted, TEST_IMG_URL, getRedditImageUrl} from './components/ImageHandlers.js'
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { CachedForm, FundraiserFormKeys, NonprofitPropsKeys } from './utils/CachedForm.js';
import { createUserSubredditHashKey, setCachedForm, setPartialCachedForm, returnCachedFormAsJSON } from './utils/Redis.js';

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

/*
TODO: I think this is overkill and there is a cleaner way to do this.
I needed this so that the data passed to showForm (in the searchSelectForm) has type Data
*/
function convertToFormData(
  nonprofits: EveryNonprofitInfo[] | null
): { nonprofits: EveryNonprofitInfo[] } {
  // console.log(":::convertToFormData: \n" + JSON.stringify(nonprofits));
  return {
    nonprofits: nonprofits ?? [],
  };
}

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
    if (typeof values.nonprofit != null) {
      console.log(values.nonprofit)
      const nonprofitInfo: EveryNonprofitInfo = JSON.parse(values.nonprofit)
      // handle case where we see a missing field--specifically the ones that should have been set in prior form(s). 
      // maybe empty fields shouldnt be caught at all in the hget wrapper since thats not unexpected behavior?
      const nonprofitPropsForm: Partial<CachedForm<FundraiserFormKeys, NonprofitPropsKeys>> = {
        nonprofitProps: {
            description: nonprofitInfo.description,
            ein: nonprofitInfo.ein,
            profileUrl: nonprofitInfo.profileUrl
        },
        lastUpdated: undefined
      };
      try {
        // two async calls in one try: bad?
        // we'll be doing this pair of calls quite a bit--wrap in function?
        const key = await createUserSubredditHashKey(ctx);
        await setPartialCachedForm(ctx, key, nonprofitPropsForm);
        console.log(JSON.stringify(returnCachedFormAsJSON(ctx, key)));
      } catch (error){
        console.error('Failed to get userSubreddit Key or set form in redis:', error)
      }
      return ctx.ui.showForm(descriptionForm);}
    }
  );
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

  // Form 3 searchSelectForm -> *descriptionForm* -> imageForm
  const descriptionForm = Devvit.createForm( //TODO: unfinished
    () => {
      return {
        fields: [
          { label: `Fill in the body text of your post here`,
          type: 'paragraph',
          name: 'description'}
        ],
        title: 'Describing Your Fundraiser',
        acceptLabel: 'Next (post preview)',//'Next (image upload)',
        cancelLabel: 'Cancel'
      }
    },
    async ({values}, ctx) => {
      if (typeof values.description != null) {
        const nonProfitDescriptionForm: CachedForm<FundraiserFormKeys, NonprofitPropsKeys> = {
          formFields: {
            formDescription: (JSON.parse(values.description) as EveryNonprofitInfo).description,
            imageUrl: null
          },
          nonprofitProps: {
            description: null,
            ein: null,
            profileUrl: null
          }
        }
        try {
          // two async calls in one try: bad?
          // we'll be doing this pair of calls quite a bit--wrap in function?
          const key = await createUserSubredditHashKey(ctx);
          await setCachedForm(ctx, key, nonProfitDescriptionForm);
        } catch (error){
          console.error('Failed to get userSubreddit Key or set form in redis:', error)
        }
      }
      return ctx.ui.showForm(submitForm, values); //return ctx.ui.showForm(imageForm, values);
    }
  );

  // Form 4 descriptionForm -> *imageForm* -> submitForm
  //FIXME: Skipping for now
  const imageForm = Devvit.createForm( //TODO: can we even have users submit images in a form?
    (data) => {
      return {
        fields: [
          { label: 'Select a different image',
          type: 'string',
          name: 'image'}
        ],
        title: 'Selecting an Image For Your Post',
        acceptLabel: 'Next (post preview)',
        cancelLabel: 'Cancel'
      }
    },
    async ({values}, ctx) => {
      return ctx.ui.showForm(submitForm, values);
    }
  )

  const submitForm = Devvit.createForm( 
    (data) => {
      return {
        fields: [
          { label: '',
          type: '',
          name: ''}
        ],
        title: 'Describing your fundraiser',
        acceptLabel: 'Next (image upload)',
        cancelLabel: 'Cancel'
      }
    },
    async ({values}, ctx) => {

    }
  )


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

  Devvit.addMenuItem({
    label: 'Create a fundraiser',
    location: 'subreddit',
    forUserType: 'moderator',
    onPress: async (_event, { ui }) => {
      return ui.showForm(searchTermForm);
    },
  });

  Devvit.addCustomPostType({
    name: "Fundraiser",
    render: (context) => {
      //const { useState, postId } = context;
      // console.log(JSON.stringify({'addCustomPostTypeContext': context}));
      return (
        <blocks height="regular">
          <vstack>
            <text style="heading" size="xxlarge">
              Fundraiser created! 2
            </text>
            <button icon="heart" appearance="primary" />
            <text style="paragraph" size="small">
            </text>
          </vstack>
        </blocks>
      );
    }
  });

Devvit.addSettings([
  {
    name: 'every-public-api-key',
    label: 'Every.org public api key',
    type: 'string',
    isSecret: true,
    scope: 'app',
  },
]);

export default Devvit;
