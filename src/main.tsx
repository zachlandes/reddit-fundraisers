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
        <image
          url="loading.gif"
          description="Loading ..."
          height={'140px'}
          width={'140px'}
          imageHeight={'240px'}
          imageWidth={'240px'}
        />
        <spacer size="small" />
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

  //TODO: determine framework for linking customposttype to the form submissions and get the menu button working
  Devvit.addCustomPostType({
    name: "Fundraiser",
    render: (context) => {
      
    }
  })
// Devvit.addCustomPostType({
//   name: 'Search term',
//   render: ({ useForm, useState, ui }) => {
//     const [searchTerm, setTerm] = useState('default search term');

//     const searchTermForm = useForm({fields: [{ label: 'term', type: 'string', name: 'searchTerm'}]}, (values) => {
//       setTerm(values.searchTerm);
//       ui.showForm(dynamicForm, values.searchTerm)
//     });

//     return (
//       <vstack>
//         <text>Search here:</text>
//         <button onPress={() => { ui.showForm(searchTermForm) }}>search</button>
//       </vstack>
//     )
//   }
// })

Devvit.addMenuItem({
  label: 'Add a fundraiser custom post',
  location: 'subreddit',
  forUserType: 'member',
  onPress: async (_event, { ui }) => {
    return ui.showForm(searchTermForm);
  },
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
// // Add a custom post type definition
// Devvit.addCustomPostType({
//   name: 'Custom Post',
//   height: 'regular',
//   render: (context) => {
//     const { useState } = context;
//     const [counter, startDonation] = useState(0);

//     return (
//       <vstack height="100%" width="100%" gap="medium" alignment="center middle">
//         <image
//           url="donate.png"
//           description="logo"
//           imageHeight={51}
//           imageWidth={138}
//           height="48px"
//           width="48px"
//         />
//         <text size="large">{`Click counter: ${counter}`}</text>
//         <button appearance="primary" onPress={() => context.ui.navigateTo('https://www.every.org/unrsf/f/help-halve-road-deaths')}>
//           Click me!
//         </button>
//       </vstack>
//     );
//   },
// });

export default Devvit;
