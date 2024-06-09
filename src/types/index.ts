import { Currency } from './enums.js';

//closely coupled to typeHelpers, they must be updated together :/
export interface TypeMapping {
    generalNonprofitInfo: GeneralNonprofitInfo;
    everyNonprofitInfo: EveryNonprofitInfo;
    baseFormFields: BaseFormFields;
    fundraiserFormFields: FundraiserFormFields;
    fundraiserDetails: EveryFundraiserRaisedDetails;
    fundraiserCreationResponse: FundraiserCreationResponse;
    everyExistingFundraiserInfo: EveryExistingFundraiserInfo;
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
    nonprofitID: string,
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
    imageBase64?: string | null; //FIXME: if this is optional, should we allow null?
    currency: Currency; 
};

export type EveryExistingFundraiserInfo = {
    entityName: string;
    id: string;
    createdAt: Date;
    nonprofitId: string;
    creatorUserId: string;
    creatorNonprofitId: string;
    slug: string;
    title: string;
    description: string | null;
    active: boolean;
    startDate: Date | null;
    endDate: Date | null;
    pinnedAt: Date | null;
    goalAmount: number;
    goalCurrency: string;
    metadata: {
        donationThankYouMessage: string;
    };
    parentFundraiserId: string | null;
    childrenFundraiserIds: string[];
    eventIds: string[];
    coverImageCloudinaryId: string | null; //FIXME: rename to coverImageUrl maybe, and add code to check if it is uploaded to reddit and create if not, then substitute the reddit link
};

export type EveryFundraiserRaisedDetails = {
    currency: string;
    raised: number;
    supporters: number;
    goalAmount: number;
    goalType: string;
};

export type FundraiserCreationResponse = {
    id: string;
    nonprofitId: string;
    title: string;
    description: string;
    startDate: Date | null;  
    endDate: Date;   
    goal: number;
    raisedOffline: number | null;
    currency: Currency;
    amountRaised: number;
    createdAt: Date;
    updatedAt: Date;
    links: {
        self: string;
        web: string;
    };
}

//TODO: this is a duplicate of the type above, but with the dates serialized. We should probably just use the original type and add a new type that extends it with the dates serialized.
export type SerializedFundraiserCreationResponse = {
    id: string;
    nonprofitId: string;
    title: string;
    description: string;
    startDate: string | null;  
    endDate: string;   
    goal: number;
    raisedOffline: number | null;
    currency: Currency;
    amountRaised: number;
    createdAt: string;
    updatedAt: string;
    links: {
        self: string;
        web: string;
    };
};

export * from './enums.js';
