// abstract type
export type CachedForm<T extends string, U extends string> = { // strings only?
    formFields: {
        [key in T]: string;
    },
    context: { //maybe we don't want to store the context since its in scope for forms?
        [key in U]: string;
    }
    //other props?
}

// implementations TODO: where should these go?
export type FundraiserFormKeys = 'description' | 'nonprofitName' | 'imageUrl'
export type ContextKeys = 'exampleContextKey'

const formResults: FormData<FundraiserFormKeys, ContextKeys> = {
    formFields: {
        description: 'description here',
        nonprofitName: 'nonprofit name here'
        //notice this design doesn't require all the possible keys...bad?
    },
    context: {
        exampleContextKey: 'key value'
    }
}