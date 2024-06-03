import { TypeMapping } from '../types/index.js';

// Identity function to ensure type safety
export function createTypeKeys<T>(t: { [P in keyof T]: P }): { [P in keyof T]: P } {
    return t;
}

// This will have to be updated whenever new keys are added to TypeMapping
export const TypeKeys = createTypeKeys<TypeMapping>({
    generalNonprofitInfo: 'generalNonprofitInfo',
    everyNonprofitInfo: 'everyNonprofitInfo',
    baseFormFields: 'baseFormFields',
    fundraiserFormFields: 'fundraiserFormFields'
}); //TODO: It may make sense, especially if we have multiple form flows, to create different sets of TypeKeys for different form flows