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
        console.error('Error fetching subreddit name or current user:', error);
        throw error;
    }
}

function processForm<T extends string>(form: CachedForm<T>){
    const { formFields} = form;
    const fieldValues: { [field: string]: string } = {
        ...formFields,
        lastUpdated: '',
    };
    return fieldValues;
}

async function setFormFields<T extends string>(context: Context, createKey: (context: Context) => Promise<string | null>, form: CachedForm<T>) {
    const { redis } = context;
    try {
        const key = await createKey(context); 
        if (!key) {
            throw new Error('Key is null.');
        }
        if (form.formFields) {
               form.lastUpdated = Date.now().toString()
                }
                await redis.hset(key, processForm(form));
        console.log('Form fields set successfully.');
    } catch (error) {
        console.error('Error setting form fields:', error);
        throw error
    }
}


// usage
// const descriptionForm: CachedForm<"description"> = {
//     formFields: {
//         description: "some string"
//     }
// }
// await setFormFields(context, createUserSubredditHashKey, descriptionForm);


