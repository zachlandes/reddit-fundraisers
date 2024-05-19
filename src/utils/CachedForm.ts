// abstract type
export type CachedForm<T extends string, U extends string> = {
    formFields: {
        [key in T]: string | null;
    },
    nonprofitProps: {
        [key in U]: string | null;
    }
    lastUpdated?: string; // this should never be set explicitly by the client
}

//TODO: where should these go?
const fundraiserFormKeys = ['formDescription', 'formImageUrl'] as const;
//TODO: should be made to align with nonprofitInfo type or every.org search request result
const nonprofitPropsKeys = ['ein', 'profileUrl', 'description'] as const;

export type FundraiserFormKeys = typeof fundraiserFormKeys[number];
export type NonprofitPropsKeys = typeof nonprofitPropsKeys[number];

export function isFormField(field: string): field is FundraiserFormKeys {
    return (fundraiserFormKeys as readonly string[]).includes(field);
}

export function isNonprofitProp(field: string): field is NonprofitPropsKeys {
    return (nonprofitPropsKeys as readonly string[]).includes(field);
}

// example
// const formResults: CachedForm<FundraiserFormKeys> = {
//     formFields: {
//         description: 'description here',
//         imageUrl: null
//         //notice this design doesn't require all the possible keys...bad?
//     },
// }