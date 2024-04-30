// Learn more at developers.reddit.com/docs
import { Context, Devvit, SettingsClient } from '@devvit/public-api';
import type { Post } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

// const App: Devvit.CustomPostComponent = async (context) => {

// };
type Nonprofit = {
  name: string;
  profileUrl: string;
  ein: string;
  description: string;
}

// async function fetchNonProfitResults(query: string, settings: SettingsClient): Promise<string[]> {
//   const everyPublicKey = await settings.get('every-public-api-key');
//   let response = await fetch(`https://partners.every.org/v0.2/search/${query}?apiKey=${everyPublicKey}`);
//   if (!response.ok) {
//     throw new Error('Every.org search request failed');
//   }
//   const data = await response.json();
//   return data.nonprofits.map(item: object => item.name);
// }
export function LoadingState(): JSX.Element {
  return (
    <zstack width={'100%'} height={'100%'} alignment="center middle">
      <vstack width={'100%'} height={'100%'} alignment="center middle">
        <text size="large" weight="bold">
          Scoreboard loading...
        </text>
      </vstack>
    </zstack>
  );
}

const dynamicForm = Devvit.createForm(
  (data) => {
    const term1 = data.term
    return {
      fields: [
        {
          name: 'who',
          label: 'which search result would you like to select?',
          type: 'select',
          options: [
            { label: `${term1}`, value: term1 },
            { label: `${term1}`, value: term1 },
          ],
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
    const post: Post = await reddit.submitPost({
      preview: LoadingState(),
      title: postTitle && postTitle.length > 0 ? postTitle : `Nonprofit Fundraiser: ${values.who}`,
      subredditName: currentSubreddit.name,
    });
  }
);

const searchTermForm = Devvit.createForm(
  () => {
    return {
      fields: [
        { label: 'term', 
        type: 'string', 
        name: 'searchTerm'}
      ],
      title: 'Create Fundraiser Post',
      acceptLabel: 'Next',
      cancelLabel: 'Back',
    };
  },
  async ({ values }, ctx) => {
    const term = values.term
    const { reddit } = ctx;
    return ctx.ui.showForm(dynamicForm, { term });
    }
  );

  Devvit.addMenuItem({
    label: 'Add a fundraiser custom post',
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
