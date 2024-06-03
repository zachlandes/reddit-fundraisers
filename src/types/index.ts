import { Currency } from './enums.js';

export interface TypeMapping {
    generalNonprofitInfo: GeneralNonprofitInfo;
    everyNonprofitInfo: EveryNonprofitInfo;
    baseFormFields: BaseFormFields;
    fundraiserFormFields: FundraiserFormFields;
    fundraiserDetails: EveryFundraiserRaisedDetails;
}

export type BaseFormFields = {
    formDescription: string | null;
    formTitle: string | null;
    [key: string]: string | null;
};

export type FundraiserFormFields = BaseFormFields & {
    formImageUrl: string | null;
};

export type GeneralNonprofitInfo = {
    name: string,
    profileUrl: string,
    description: string,
    ein: string,
    websiteUrl: string
};

export type EveryNonprofitInfo = GeneralNonprofitInfo &
{
    primarySlug: string
    logoUrl: string | null,
    coverImageUrl: string | null,
}

export type EveryFundraiserInfo = {
    nonprofitID: string;
    title: string;
    description: string | null;
    startDate: Date | null;
    endDate: Date | null;
    goal: number | null;
    raisedOffline: number | null;
    imageBase64: string | null;
    currency?: Currency; 
};

export type EveryFundraiserRaisedDetails = {
    currency: string;
    raised: number;
    supporters: number;
    goalAmount: number;
    goalType: string;
};

export * from './enums.js';

