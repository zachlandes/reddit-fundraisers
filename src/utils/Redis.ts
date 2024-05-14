import { Context } from '@devvit/public-api';

export async function createUserSubredditHashKey(context: Context): Promise<string | null>{
    const { reddit } = context;
    const currentSubreddit = await reddit.getCurrentSubreddit();
    const username = await reddit.getCurrentUser();
    return `user:${username}:${currentSubreddit}`;
}


// e.g. fields = ['description:New description', 'nonprofitName:New nonprofit name']
export async function setRedisField(
    context: Context, getKey: () => Promise<string | null>,
    ...fields: string[]): Promise<void> {
    const { redis } = context;
    try { //FIXME: rewrite trys so that each await is wrapped in its own try and error has more context
        const key = await getKey();
        if (!key) {
            console.error('Invalid key');
            return;
        }

        for (const field of fields) {
            const [fieldName, value] = field.split(':');
            if (value) {
                await redis.hset(key, {fieldName : value});
            }
        }
    } catch (error) {
        console.error('Error setting form fields:', error);
    }
} 