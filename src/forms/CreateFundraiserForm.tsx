import { Devvit, ZMember } from '@devvit/public-api';

export const addPoll = Devvit.createForm(
  {
    title: 'Create a fundraiser',
    acceptLabel: 'Create',
    fields: [
      {
        name: 'question',
        label: 'Question',
        type: 'string',
        required: true,
        helpText: `E.g. What is your favorite color?`,
      },
    ],
  },
  async (event, { reddit, subredditId, ui, redis }) => {
    const sub = await reddit.getSubredditById(subredditId);
    const answers: ZMember[] = event.values.answers
      .split(',') // Split int array
      .filter((answer: string) => answer.trim() !== '') // Remove empty strings
      .slice(0, 12) // Only include the first 12 answers
      .map((answer: string, i: number) => ({ member: answer.trim(), score: i }));

    if (answers.length < 2) {
      ui.showToast({
        text: 'Post Failed - You must include at least 2 poll options.',
        appearance: 'neutral',
      });
      return;
    }

    const options = {
      subredditName: sub.name,
      title: event.values.question,
      // text: "TODO - description/selftext",
      preview: (
        <hstack alignment={'center middle'}>
          <text>Loading...</text>
        </hstack>
      ),
    };
    const post = await reddit.submitPost(options);

    const timestamp = new Date().getTime() + parseInt(event.values.days) * 24 * 60 * 60 * 1000;
    const allowShowResults = event.values.allowShowResults ? 'true' : 'false';
    const randomizeOrder = event.values.randomizeOrder ? 'true' : 'false';

    await redis.set(key(KeyType.finish, post.id), timestamp + '');
    await redis.set(key(KeyType.question, post.id), event.values.question);
    await redis.set(key(KeyType.description, post.id), event.values.description);
    await redis.zAdd(key(KeyType.options, post.id), ...answers);
    await redis.set(key(KeyType.allowShowResults, post.id), allowShowResults);
    await redis.set(key(KeyType.randomizeOrder, post.id), randomizeOrder);

    ui.showToast('Poll created!');
  }
);
