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

export async function setFormFields<T extends string>(context: Context, key: string, form: CachedForm<T>) {
    const { redis } = context;
    try {
        if (form.formFields) {
            form.lastUpdated = Date.now().toString();
        }
        await redis.hset(key, processFormForRedis(form));
        console.log('Form fields set successfully.');
    } catch (error) {
        console.error('Error setting form fields: ', error);
        throw error;
    }
}

export async function getFormField(context: Context, key: string, fieldName: string): Promise<string | null> {
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

export async function getAllFormFields(context: Context, key:string) {
    const { redis } = context;
    try {
        const allFormFields = await redis.hgetall(key);
        if ((allFormFields) === undefined) {
            return null;
        }
        return allFormFields;
    } catch (error) {
        console.error(`Failed to get form fields for key ${key}: `, error)
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


