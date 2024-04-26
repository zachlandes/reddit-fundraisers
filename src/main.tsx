// Learn more at developers.reddit.com/docs
import { Context, Devvit, SettingsClient } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
});

// Add a menu item to the subreddit menu
// for instantiating the new custom post
Devvit.addMenuItem({
  label: 'Add my custom post',
  location: 'subreddit',
  forUserType: 'member',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    await reddit.submitPost({
      title: 'My custom post',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: 'Created post!' });
  },
});

// const App: Devvit.CustomPostComponent = async (context) => {

// };
async function fetchNonProfitResults(query: string, settings: SettingsClient): Promise<string[]> {
  const everyPublicKey = await settings.get('every-public-api-key');
  let response = await fetch(`https://partners.every.org/v0.2/search/${query}?apiKey=${everyPublicKey}`);
  if (!response.ok) {
    throw new Error('Every.org search request failed');
  }
  const data = await response.json();
  return data.nonprofits.map(item: object => item.name);
}

Devvit.addCustomPostType({
  name: 'Multi-step form',
  description: 'Create and post a fundraiser',
  render: ({ useForm, useState, ui, settings}) => {
    const [name, setName] = useState('Mysterious person');
    let nonProfitResults: string[] = []; 
	// Form must be defined within the render method
    const searchForm = useForm(
      () => ({
        title: `${name[0]}, which nonprofit do you want to fundraise for?`,
        fields: [
          {
            type: 'string',
            label: 'Search for a nonprofit',
            name: 'search',
          },
        ],
      }),
      ({values}) => {
        const search = values['search'][0]
        if (search.length > 0) {
          nonProfitResults = await fetchNonProfitResults(search, settings)
          ui.showForm(searchResultsForm);
        }
      }
    );

    const searchResultsForm = useForm(
      () => ({
        title: "results",
        fields: [
          {
          type: 'select',
          label: 'Nonprofit search results'
          name: 'nonprofit',
          options: nonProfitResults
        }
      ]
    }),
      ({values}) => {
        
      }
    )

    return (
      <vstack>
        <text>Hello {name}</text>

	// Add a button which calls ui.showForm();
        <button onPress={() => { ui.showForm(searchForm) }}>Change name</button>
      </vstack>
    )
  }
});

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
