import { Context, RedisClient } from '@devvit/public-api';
import { CachedForm, FundraiserFormKeys, PropsKeys } from './CachedForm.js';


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

function processFormForRedis<T extends string>(form: CachedForm<T>){
    const { formFields} = form;
    const fieldValues: { [field: string]: string } = {
        ...formFields,
        lastUpdated: '',
    };
    return fieldValues;
}

export async function setCachedForm<T extends string>(context: Context, key: string, form: CachedForm<T>) {
    const { redis } = context;
    const expireTimeInSeconds = 600;
    try {
        if (form.formFields) {
            form.lastUpdated = Date.now().toString();
        }
        await redis.hset(key, processFormForRedis(form));
        await redis.expire(key, expireTimeInSeconds);
        console.log('Form fields set successfully.');
    } catch (error) {
        console.error('Error setting form fields: ', error);
        throw error;
    }
}

// maybe unnecessary, we can just pull the entire form with getCachedForm everytime
export async function getFormFields(context: Context, key: string, fieldName: string): Promise<string | null> {
    const { redis } = context;
    try {
        const fieldValue = await redis.hget(key, fieldName);
        if (fieldValue === undefined || fieldValue === '') {
            return null; //should we return undefined instead since this is a "missing" property and not a key error?
        }
        return fieldValue;
    } catch (error) {
        console.error(`Failed to get value for field ${fieldName} at key ${key}: `, error);
        throw error; // be sure to handle errors in the calling code (and maybe a toast for user)
    }
}

async function getCachedForm(
    context: Context,
    key: string
): Promise<Record<string, string> | null> {
    const { redis } = context;
    try {
        const allFormFields = await redis.hgetall(key);
        if (!allFormFields || Object.keys(allFormFields).length === 0) {
            return null;
        }
        return allFormFields;
    } catch (error) {
        console.error(`Failed to get form fields for key ${key}: `, error);
        return null;
    }
}

function parseForm<T extends string>(
    cachedForm: Record<string, string> | null
): CachedForm<T> | null {
    if (cachedForm === null) {
        return null;
    }

    // Assuming the cached form is stored as a flat object in Redis
    const formFields: { [key in T]: string | null } = {} as { [key in T]: string | null };
    let lastUpdated: string | undefined = undefined;

    for (const [field, value] of Object.entries(cachedForm)) {
        if (field === 'lastUpdated') {
            lastUpdated = value;
        } else {
            formFields[field as T] = value;
        }
    }

    return {
        formFields,
        lastUpdated,
    };
}

export async function returnCachedFormAsJSON<T extends string>(
    context: Context,
    key: string
): Promise<CachedForm<T> | null> {
    try {
        const cachedForm = await getCachedForm(context, key);
        const parsedForm = parseForm<T>(cachedForm);
        return parsedForm;
    } catch (error) {
        console.error(`Failed to return cached form as JSON for key ${key}:`, error);
        // is this the right level to show the toast message or one up? return null or undefined or rethrow?
        throw error;
    }
}




// usage
// const descriptionForm: CachedForm<"description"> = {
//     formFields: {
//         description: "some string"
//     }
// }
// let key: string;
// try {
//     const key = await createUserSubredditHashKey(context);
//     await setFormFields(context, key, form);
// } catch (error) {
//     console.error('Error in example usage:', error);
//     //toast error message for user etc.
// }


