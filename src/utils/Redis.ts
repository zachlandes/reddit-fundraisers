import { Context, RedisClient } from '@devvit/public-api';
import { CachedForm } from './CachedForm.js';
import { EveryFundraiserRaisedDetails } from '../types/index.js';
import { RedisKey } from '../types/enums.js'; // Import the enum

/**
 * Creates a unique Redis key for a user based on their current subreddit.
 * This key is used to store and retrieve user-specific data in Redis.
 * 
 * @param {Context} context - The context containing the Reddit client.
 * @returns {Promise<string>} A promise that resolves to the Redis key string.
 * @throws {Error} If the subreddit or username is null.
 */
export async function createUserSubredditHashKey(context: Pick<Context, "reddit">): Promise<string> {
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

/**
 * Stores a serialized form in Redis under a specified key.
 * The form's last updated timestamp is set before saving.
 * 
 * @param {Context} context - The context containing the Redis client.
 * @param {string} key - The Redis key under which the form is stored.
 * @param {CachedForm} form - The form data to be cached.
 * @returns {Promise<void>}
 */
export async function setCachedForm(
    context: Pick<Context, "redis">,
    key: string,
    form: CachedForm
): Promise<void> {
    const { redis } = context;
    if (!form.getLastUpdated()) {
        form.setLastUpdated(new Date().toISOString());
    }
    const serializedForm = JSON.stringify(form.serializeForRedis());
    await redis.set(key, serializedForm);
}

/**
 * Retrieves a specific field value from a form stored in Redis.
 * 
 * @param {Context} context - The context containing the Redis client.
 * @param {string} key - The Redis key where the form is stored.
 * @param {string} fieldName - The name of the field to retrieve.
 * @returns {Promise<string | null>} The value of the field, or null if not found or empty.
 * @throws {Error} If there is an error during the retrieval.
 */
export async function getFormFields(context: Pick<Context, "redis">, key: string, fieldName: string): Promise<string | null> {
    const { redis } = context;
    try {
        const fieldValue = await redis.hget(key, fieldName);
        return fieldValue === undefined || fieldValue === '' ? null : fieldValue;
    } catch (error) {
        console.error(`Failed to get value for field ${fieldName} at key ${key}: `, error);
        throw error; // be sure to handle errors in the calling code (and maybe a toast for user)
    }
}

/**
 * Retrieves a cached form from Redis and deserializes it into a CachedForm object.
 * 
 * @param {Context} context - The context containing the Redis client.
 * @param {string} key - The Redis key under which the form is stored.
 * @returns {Promise<CachedForm | null>} The deserialized form, or null if not found.
 */
export async function getCachedForm(
    context: Pick<Context, "redis">,
    key: string
): Promise<CachedForm | null> {
    const { redis } = context;
    const serializedForm = await redis.get(key);
    if (!serializedForm) {
        return null;
    }
    const formData = JSON.parse(serializedForm);
    const cachedForm = new CachedForm();
    cachedForm.deserializeFromRedis(formData);
    return cachedForm;
}

/**
 * Adds or updates a post in Redis with a score based on its end date.
 * If the end date is null, a distant future date is used as the score.
 * 
 * @param {RedisClient} redis - The Redis client.
 * @param {string} postId - The ID of the post to add or update.
 * @param {Date | null} endDate - The end date of the post, used to calculate the score.
 * @returns {Promise<void>}
 */
export async function addOrUpdatePostInRedis(redis: RedisClient, postId: string, endDate: Date | null): Promise<void> {
    // Use a very distant future date if endDate is null
    console.log("endDate: ", endDate);
    const score = endDate ? endDate.getTime() : new Date('2054-12-31').getTime();
    await redis.zAdd(RedisKey.AllSubscriptions, { score, member: postId });
    console.log(`Post ${postId} added or updated with end date score ${score}`);
}

/**
 * Removes a post and its associated form from Redis.
 * 
 * @param {RedisClient} redis - The Redis client.
 * @param {string} postId - The ID of the post to remove.
 * @returns {Promise<void>}
 */
export async function removePostAndFormFromRedis(redis: RedisClient, postId: string): Promise<void> {
    // Remove the post from the list of subscriptions
    await removePostSubscriptionFromRedis(redis, postId);
    // Remove the CachedForm associated with the post
    await redis.del(postId);
    // Remove the fundraiser-raised-amount key
    await redis.del(`fundraiser-raised-amount-${postId}`);
    console.log(`Post, associated form, and fundraiser-raised-amount with ID ${postId} removed from Redis`);
}

/**
 * Removes a post from the subscription list in Redis.
 * 
 * @param {RedisClient} redis - The Redis client.
 * @param {string} postId - The ID of the post to remove.
 * @returns {Promise<void>}
 */
export async function removePostSubscriptionFromRedis(redis: RedisClient, postId: string): Promise<void> {
    await redis.zRem(RedisKey.AllSubscriptions, [postId]);
    console.log(`Post ${postId} removed from Redis`);
}

/**
 * Removes posts from Redis that have expired based on the current time.
 * 
 * @param {RedisClient} redis - The Redis client.
 * @returns {Promise<void>}
 */
export async function removeExpiredPosts(redis: RedisClient): Promise<void> {
    const currentTime = Date.now();
    const removedCount = await redis.zRemRangeByScore(RedisKey.AllSubscriptions, Number.NEGATIVE_INFINITY, currentTime);
    if (removedCount > 0) {
        console.log(`Removed ${removedCount} expired posts from Redis`);
    }
}

/**
 * Fetches posts from Redis that need to be updated based on their end date scores.
 * 
 * @param {RedisClient} redis - The Redis client.
 * @returns {Promise<string[]>} An array of post IDs that need to be updated.
 */
export async function fetchPostsToUpdate(redis: RedisClient): Promise<string[]> {
    await removeExpiredPosts(redis);
    const allMembers = await redis.zRange(RedisKey.AllSubscriptions, 0, -1);
    const scoresPromises = allMembers.map(member => redis.zScore(RedisKey.AllSubscriptions, member.member));
    const scores = await Promise.all(scoresPromises);
    const currentTime = Date.now(); //FIXME: We may need to use dates (no hours mins) to be sure we update posts on the last day of their fundraiser
    const postsToUpdate = allMembers.filter((_, index) => scores[index] > currentTime)
                                    .map(member => member.member);
    //console.log(`Fetched ${postsToUpdate.length} posts to update`);
    return postsToUpdate;
}

