// abstract type
export type CachedForm<T = void | string> = { // strings only?
    formFields: {
        [key in T]: string | null;
    },
    lastUpdated?: string;
}

// implementations TODO: where should these go?
export type FundraiserFormKeys = 'description' | 'nonprofitName' | 'imageUrl'
export type PropsKeys = 'exampleContextKey'

const formResults: CachedForm<FundraiserFormKeys, PropsKeys> = {
    formFields: {
        description: 'description here',
        nonprofitName: 'nonprofit name here',
        imageUrl: null
        //notice this design doesn't require all the possible keys...bad?
    },
    lastUpdated: Date.now().toString(),
}