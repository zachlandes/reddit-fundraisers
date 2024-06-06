import { TypeMapping } from '../types/index.js';

//closely coupled to TypeMapping. They must be updated together :/
export const TypeKeys: { [P in keyof TypeMapping]: P } = {
    generalNonprofitInfo: 'generalNonprofitInfo',
    everyNonprofitInfo: 'everyNonprofitInfo',
    baseFormFields: 'baseFormFields',
    fundraiserFormFields: 'fundraiserFormFields',
    fundraiserDetails: 'fundraiserDetails',
    fundraiserCreationResponse: 'fundraiserCreationResponse'
};
