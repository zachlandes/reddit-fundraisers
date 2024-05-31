// Learn more at developers.reddit.com/docs
import { Context, Devvit, RichTextBuilder, SettingsClient } from '@devvit/public-api';
import type { Data, JSONObject, MediaAsset, Post } from '@devvit/public-api';
import type { EveryNonprofitInfo, GeneralNonprofitInfo } from './sources/Every.js';
import { fetchNonprofits, populateNonprofitSelect } from './sources/Every.js';
import { ApprovedDomainsFormatted, uploadImageToRedditCDN} from './components/ImageHandlers.js'
import { StringUtil } from '@devvit/shared-types/StringUtil.js';
import { CachedForm, FundraiserFormKeys, NonprofitPropsKeys } from './utils/CachedForm.js';
import { createUserSubredditHashKey, setCachedForm, setPartialCachedForm, returnCachedFormAsJSON } from './utils/Redis.js';
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
function convertToFormData(
  nonprofits: EveryNonprofitInfo[] | null
): { nonprofits: EveryNonprofitInfo[] } {
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
      console.log(nonprofitInfo)
      // handle case where we see a missing field--specifically the ones that should have been set in prior form(s).
      // maybe empty fields shouldnt be caught at all in the hget wrapper since thats not unexpected behavior?
      // const nonprofitInfoForm: Partial<CachedForm<FundraiserFormKeys, NonprofitPropsKeys>> = {
      //   nonprofitProps: {
      //       description: nonprofitInfo.description,
      //       ein: nonprofitInfo.ein,
      //       profileUrl: nonprofitInfo.profileUrl
      //   },
      // };
      // try {
      //   // two async calls in one try: bad?
      //   // we'll be doing this pair of calls quite a bit--wrap in function?
      //   const key = await createUserSubredditHashKey(ctx);
      //   await setPartialCachedForm(ctx, key, nonprofitInfoForm);
      // } catch (error){
      //   console.error('Failed to get userSubreddit Key or set form in redis:', error)
      // }
      return ctx.ui.showForm(submitForm, convertToFormData([nonprofitInfo]));}
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
  //FIXME: Skipping for now
  const descriptionForm = Devvit.createForm( //TODO: unfinished
    () => {
      return {
        fields: [
          { label: `Fill in the text of your post here`,
          type: 'paragraph',
          name: 'description'}
        ],
        title: 'Describing Your Fundraiser',
        acceptLabel: 'Next (post preview)',//'Next (image upload)',
        cancelLabel: 'Cancel'
      }
    },
    async ({values}, ctx) => {
      let cachedDescriptionForm: CachedForm<string, string> | null = null; //TODO: handle null so return showForm never receives null form
      if (typeof values.description != null) {
        // const descriptionForm: Partial<CachedForm<FundraiserFormKeys, NonprofitPropsKeys>> = {
        //   formFields: {
        //       formDescription: values.description,
        //       formImageUrl: null, //FIXME: How can we make it so we don't have to include this?
        //   },
        // };
        try {
          //Assuming this is the second to last form, we'd need to pull down the cachedForm, add the description to it
          //and pass everything as Data to the next form
          const key = await createUserSubredditHashKey(ctx);
          cachedDescriptionForm = await returnCachedFormAsJSON(ctx, key)
          if (cachedDescriptionForm != null) {
            cachedDescriptionForm.formFields.formDescription = values.description;
            console.log("cachedDescriptionForm: ", cachedDescriptionForm);
          } else {
            throw Error;
          }
        } catch (error){
          console.error('Failed to get userSubreddit Key or set form in redis:', error)
          ctx.ui.showToast("There was an error, please try again later!") // Or try again right away?
        }
      }
      return ctx.ui.showForm(submitForm, convertToFormData(cachedDescriptionForm)); //return ctx.ui.showForm(imageForm, values);
    }
  );

  // Form 4 descriptionForm -> *imageForm* -> submitForm
  //FIXME: Skipping for now
  const imageForm = Devvit.createForm( //TODO: can we even have users submit images in a form?
    (data) => {
      return {
        fields: [
          { name: 'image',
          label: 'Select a different image',
          type: 'string',
          }
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

  // Form 5 imageForm -> *submitForm*
  const submitForm = Devvit.createForm(
    (data) => {
      console.log(data.nonprofits);
      return {
        fields: [
          { name: 'description',
          label: `Fill in the text of your post here`,
          type: 'paragraph'},
          { name: 'postTitle',
          label: 'Post Title',
          type: 'string'
          },
          { name: 'link',
          label: 'link to donate',
          type: 'select',
          options: [
              { label: `${data.nonprofits[0].profileUrl}`, // FIXME: should we make the data typesafe by converting to form?
              value: `${data.nonprofits[0].profileUrl}`, //FIXME: `${data['profileUrl']}` if we are reading data that was cached instead, we should align these
              },
            ],
          },
        ],
          title: 'Confirm your selections and create your post',
          acceptLabel: 'Submit',
          cancelLabel: 'Cancel'
      }
    },
    async ({values}, ctx) => {
      const {reddit} = ctx;
      const currentSubreddit = await reddit.getCurrentSubreddit();
      const postTitle = values.postTitle;
      console.log(values);
      console.log(values.description);

      const myrichtext = new RichTextBuilder()
        .paragraph((p) => {
          p.text({
            text: String(values.description)
          }).link({
            text: "Donate",
            url: String(values.link),
            tooltip: "Go to the every.org donate page"
          });
        })
        .build();


      const post: Post = await reddit.submitPost({
        title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser`,
        subredditName: currentSubreddit.name,
        richtext: myrichtext,
      });
      ctx.ui.navigateTo(post)
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

export default Devvit;
