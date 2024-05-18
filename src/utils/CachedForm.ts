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
export type FundraiserFormKeys = 'formDescription' | 'imageUrl'
export type NonprofitPropsKeys = 'ein' | 'profileUrl' | 'description' //TODO: should be made to align with nonprofitInfo type or every.org search request result

// example
// const formResults: CachedForm<FundraiserFormKeys> = {
//     formFields: {
//         description: 'description here',
//         imageUrl: null
//         //notice this design doesn't require all the possible keys...bad?
//     },
// }