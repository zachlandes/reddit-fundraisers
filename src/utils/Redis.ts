import { Context, RedisClient } from '@devvit/public-api';
import { CachedForm, FundraiserFormKeys, NonprofitPropsKeys, isFormField, isNonprofitProp } from './CachedForm.js';


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
function processUpdatedFieldsForRedis<T extends string, U extends string>(
    form: Partial<CachedForm<T, U>>
): Record<string, string> {
    const result: Record<string, string> = {};

    if (form.formFields) {
        for (const key in form.formFields) {
            const value = form.formFields[key];
            if (value !== undefined) {
                result[key] = value ?? '';
            }
        }
    }

    if (form.nonprofitProps) {
        for (const key in form.nonprofitProps) {
            const value = form.nonprofitProps[key];
            if (value !== undefined) {
                result[key] = value ?? '';
            }
        }
    }

    if (form.lastUpdated) {
        result['lastUpdated'] = form.lastUpdated;
    }

    return result;
}

export async function setPartialCachedForm<T extends string, U extends string>(
    context: Context,
    key: string,
    form: Partial<CachedForm<T, U>> // Note the use of Partial here
): Promise<void> {
    const { redis } = context;
    const expireTimeInSeconds = 600; // should keep this in a config file somewhere
    try {
        if (!form.lastUpdated) {
            form.lastUpdated = Date.now().toString();
        }
        await redis.hset(key, processUpdatedFieldsForRedis(form));
        await redis.expire(key, expireTimeInSeconds);
        console.log('Form fields set successfully.');
    } catch (error) {
        console.error('Error setting form fields: ', error);
        throw error;
    }
}

function processFormForRedis<T extends string, U extends string>(form: CachedForm<T, U>): Record<string, string> {
    const result: Record<string, string> = {};

    for (const key in form.formFields) {
        const value = form.formFields[key];
        result[key] = value ?? '';
    }

    for (const key in form.nonprofitProps) {
        const value = form.nonprofitProps[key];
        result[key] = value ?? '';
    }

    if (form.lastUpdated) {
        result['lastUpdated'] = form.lastUpdated;
    }

    return result;
}



export async function setCachedForm<T extends string, U extends string>(
    context: Context,
    key: string,
    form: CachedForm<T, U>
): Promise<void> {
    const { redis } = context;
    // should keep this in a config file somewhere
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

export function parseForm<T extends string, U extends string>(
    cachedForm: Record<string, string> | null
): CachedForm<T, U> | null {
    if (cachedForm === null) {
        return null;
    }

    // Assuming the cached form is stored as a flat object in Redis
    const formFields: { [key in T]: string | null } = {} as { [key in T]: string | null };
    const nonprofitProps: { [key in U]: string | null } = {} as { [key in U]: string | null };
    let lastUpdated: string | undefined = undefined;

    for (const [field, value] of Object.entries(cachedForm)) {
        if (field === 'lastUpdated') {
            lastUpdated = value;
        } else if (isFormField(field)) {
            formFields[field as T] = value;
        } else if (isNonprofitProp(field)) {
            nonprofitProps[field as U] = value;
        }
    }

    return {
        formFields,
        nonprofitProps,
        lastUpdated,
    };
}

export async function returnCachedFormAsJSON<T extends string, U extends string>(
    context: Context,
    key: string
): Promise<CachedForm<T, U> | null> {
    try {
        const cachedForm = await getCachedForm(context, key);
        const parsedForm = parseForm<T, U>(cachedForm);
        console.log('parsed form is: ', parsedForm);
        if (parsedForm === null) {
            console.error(`Parsed form was null for ${key}`);
            throw Error;
        }
        return parsedForm;
    } catch (error) {
        console.error(`Failed to return cached form as JSON for key ${key}:`, error);
         // return null or undefined or rethrow?
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