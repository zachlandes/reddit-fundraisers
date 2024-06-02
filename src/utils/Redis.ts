import { Context } from '@devvit/public-api';
import { BaseFormFields, CachedForm } from './CachedForm.js';
import { GeneralNonprofitInfo } from '../sources/Every.js';

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
    const expireTimeInSeconds = 600; // FIXME: This should be in a config or enum, and it also may cause a bug for existing fundraisers
    try {
        if (!form.getLastUpdated()) {
            form.setLastUpdated(Date.now().toString());
        }
        const serializedForm = JSON.stringify(form.serializeForRedis());
        await redis.set(key, serializedForm);
        await redis.expire(key, expireTimeInSeconds);
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

