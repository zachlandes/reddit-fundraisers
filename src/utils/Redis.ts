import { Context, RedisClient } from '@devvit/public-api';
import { CachedForm } from './CachedForm.js';
import { EveryFundraiserRaisedDetails } from '../types/index.js';
import { RedisKey } from '../types/enums.js'; // Import the enum

export async function createUserSubredditHashKey(context: Context): Promise<string> {
    const { reddit } = context;
    try {
        const currentSubreddit = await reddit.getCurrentSubreddit();
        const username = await reddit.getCurrentUser();
        if (!currentSubreddit || !username) {
            throw new Error('Subreddit or username is null.');
        }
        return `user:${username}:${currentSubreddit}`;
    } catch (error) {
        console.error('Error fetching subreddit name or current user: ', error);
        throw error;
    }
}

export async function setCachedForm(
    context: Context,
    key: string,
    form: CachedForm
): Promise<void> {
    const { redis } = context;
    try {
        if (!form.getLastUpdated()) {
            form.setLastUpdated(new Date().toISOString());
        }
        const serializedForm = JSON.stringify(form.serializeForRedis());
        await redis.set(key, serializedForm);
        console.log('Form saved successfully.');
    } catch (error) {
        console.error('Error saving form: ', error);
        throw error;
    }
}

// maybe unnecessary, we can just pull the entire form with getCachedForm everytime
export async function getFormFields(context: Context, key: string, fieldName: string): Promise<string | null> {
    const { redis } = context;
    try {
        const fieldValue = await redis.hget(key, fieldName);
        return fieldValue === undefined || fieldValue === '' ? null : fieldValue;
    } catch (error) {
        console.error(`Failed to get value for field ${fieldName} at key ${key}: `, error);
        throw error; // be sure to handle errors in the calling code (and maybe a toast for user)
    }
}

// Make getCachedForm a generic function
export async function getCachedForm(
    context: Context,
    key: string
): Promise<CachedForm | null> {
    const { redis } = context;
    try {
        const serializedForm = await redis.get(key);
        if (!serializedForm) {
            return null;
        }
        const formData = JSON.parse(serializedForm);
        const cachedForm = new CachedForm();
        cachedForm.deserializeFromRedis(formData);
        return cachedForm;
    } catch (error) {
        console.error(`Failed to retrieve form for key ${key}: `, error);
        return null;
    }
}

export async function addOrUpdatePostInRedis(redis: RedisClient, postId: string, endDate: Date | null): Promise<void> {
    // Use a very distant future date if endDate is null
    console.log("endDate: ", endDate);
    const score = endDate ? endDate.getTime() : new Date('2054-12-31').getTime();
    await redis.zAdd(RedisKey.AllSubscriptions, { score, member: postId });
    console.log(`Post ${postId} added or updated with end date score ${score}`);
}

export async function removePostAndFormFromRedis(redis: RedisClient, postId: string): Promise<void> {
    // Remove the post from the list of subscriptions
    await removePostSubscriptionFromRedis(redis, postId);
    // Remove the CachedForm associated with the post
    await redis.del(postId);
    console.log(`Post and associated form with ID ${postId} removed from Redis`);
}

export async function removePostSubscriptionFromRedis(redis: RedisClient, postId: string): Promise<void> {
    await redis.zRem(RedisKey.AllSubscriptions, [postId]);
    console.log(`Post ${postId} removed from Redis`);
}

export async function removeExpiredPosts(redis: RedisClient): Promise<void> {
    const currentTime = Date.now();
    const removedCount = await redis.zRemRangeByScore(RedisKey.AllSubscriptions, Number.NEGATIVE_INFINITY, currentTime);
    console.log(`Removed ${removedCount} expired posts from Redis`);
}

export async function fetchPostsToUpdate(redis: RedisClient): Promise<string[]> {
    await removeExpiredPosts(redis);
    const allMembers = await redis.zRange(RedisKey.AllSubscriptions, 0, -1);
    const scoresPromises = allMembers.map(member => redis.zScore(RedisKey.AllSubscriptions, member.member));
    const scores = await Promise.all(scoresPromises);
    const currentTime = Date.now(); //FIXME: We may need to use dates (no hours mins) to be sure we update posts on the last day of their fundraiser
    const postsToUpdate = allMembers.filter((_, index) => scores[index] > currentTime)
                                    .map(member => member.member);
    console.log(`Fetched ${postsToUpdate.length} posts to update`);
    return postsToUpdate;
}
