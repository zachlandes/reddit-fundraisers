// Learn more at developers.reddit.com/docs
import { Context, Devvit, SettingsClient, RichTextBuilder } from '@devvit/public-api';
import type { Post } from '@devvit/public-api';
import type { GeneralNonprofitInfo } from './sources/Every.js';
import { fetchNonprofits } from './sources/Every.js';

Devvit.configure({
  redditAPI: true,
  http: true
});

type Nonprofit = {
  name: string;
  profileUrl: string;
  ein: string;
  description: string;
}

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

//TODO: I think this is overkill and there is a cleaner way to do this. I needed this so that the data passed to showForm (in the dynamicForm) has type Data
function convertToFormData(
  nonprofits: GeneralNonprofitInfo[] | null
): { nonprofits: GeneralNonprofitInfo[] } {
  return {
    nonprofits: nonprofits ?? [],
  };
}


const dynamicForm = Devvit.createForm(
  (data) => {
    return {
      fields: [
        {
          name: 'nonprofit',
          label: 'Select your nonprofit',
          type: 'select',
          options: data.nonprofits.map((nonprofit: GeneralNonprofitInfo) => ({
            label: `${nonprofit.name}`,
            value: nonprofit.description, //TODO: since value has to be a string, how can we pass the entire selected nonprofit object to the onsubmit handler?
          })),
        },
        {
          name: 'postTitle',
          label: 'Post title',
          type: 'string',
          required: false,
        }
      ],
      title: 'Selection of terms from search results',
      acceptLabel: 'Select this term and create a post!',
      cancelLabel: 'Cancel'
    };
  },
  async ({ values }, ctx) => {
    const {reddit} = ctx;
    const currentSubreddit = await reddit.getCurrentSubreddit();
    const postTitle = values.postTitle;
    const nonprofitDescription = values.nonprofit; 
    console.log(postTitle + " " + nonprofitDescription)
    const post: Post = await reddit.submitPost({
      preview: LoadingState(),
      title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser`,
      subredditName: currentSubreddit.name, 
    }); 
  }
);

const searchTermForm = Devvit.createForm(
  () => {
    return {
      fields: [
        { label: 'Search for a nonprofit by name', 
        type: 'string', 
        name: 'searchTerm'}
      ],
      title: 'Create a fundraiser',
      acceptLabel: 'Next',
      cancelLabel: 'Back',
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
      if (typeof searchResults != null) {return ctx.ui.showForm(dynamicForm, convertToFormData(searchResults));}
      
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
      return (
        <blocks height="regular">
          <vstack>
            <text style="heading" size="xxlarge">
              Fundraiser created!
            </text>
            <button icon="heart" appearance="primary" />
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
