// abstract type
export type CachedForm<T extends string> = { // strings only?
    formFields: {
        [key in T]: string | null;
    },
    lastUpdated?: string; // this should never be set explicitly by the client
}

//TODO: where should these go?
export type FundraiserFormKeys = 'description' | 'imageUrl'

// example
// const formResults: CachedForm<FundraiserFormKeys> = {
//     formFields: {
//         description: 'description here',
//         imageUrl: null
//         //notice this design doesn't require all the possible keys...bad?
//     },
// }