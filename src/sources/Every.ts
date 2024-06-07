import { Context, Data, Devvit, SettingsClient } from '@devvit/public-api';
import { Currency, EveryFundraiserInfo, EveryFundraiserRaisedDetails, EveryNonprofitInfo, FundraiserCreationResponse } from '../types/index.js';
import { mockFundraiserCreationResponse, mockNonprofits, getMockFundraiserRaisedDetails } from '../mocks/index.js';
import { convertToDate } from '../utils/dateUtils.js';

const USE_MOCK = true; // Toggle this to false to use real API calls

export enum APIService {
    EVERY = `partners.every.org`
}

export async function createFundraiser(
    fundraiserInfo: EveryFundraiserInfo,
    publicKey: string,
    privateKey: string 
): Promise<FundraiserCreationResponse> {
    if (USE_MOCK) {
        console.log('Using mock data for createFundraiser');
        return Promise.resolve(mockFundraiserCreationResponse);
    }

    const apiUrl = 'https://partners.every.org/v0.2/fundraiser';

    try {
        const authHeader = `Basic ${btoa(`${publicKey}:${privateKey}`)}`;

        const body: Record<string, any> = {
            nonprofitId: fundraiserInfo.nonprofitID,
            title: fundraiserInfo.title,
            description: fundraiserInfo.description ?? null,
            startDate: fundraiserInfo.startDate ? fundraiserInfo.startDate.toISOString() : null,
            endDate: fundraiserInfo.endDate ? fundraiserInfo.endDate.toISOString() : null,
            goal: fundraiserInfo.goal ?? null,
            raisedOffline: fundraiserInfo.raisedOffline ?? null,
            imageBase64: fundraiserInfo.imageBase64 ?? null,
            currency: fundraiserInfo.currency || Currency.USD
        };

        const request = new Request(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(body),
        });

        const res = await fetch(request);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        console.log('Fundraiser created successfully');

        return {
            ...data,
            startDate: convertToDate(data.startDate),
            endDate: convertToDate(data.endDate),
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt)
        } as FundraiserCreationResponse;
    } catch (e) {
        console.error('Error creating fundraiser:', e);
        throw e;
    }
}



export async function fetchNonprofits(
    query: string,
    publicKey: string
): Promise<EveryNonprofitInfo[] | null> {
    if (USE_MOCK) {
        console.log('Using mock data for fetchNonprofits');
        return Promise.resolve(mockNonprofits);
    }

    const apiUrl = `https://partners.every.org/v0.2/search/${query}?apiKey=${publicKey}`;
    try {
        const request = new Request(apiUrl, {
            headers: { Accept: 'application/json' },
        });
        const res = await fetch(request);
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        return data.nonprofits.map((nonprofit: any) => parseNonprofitResult(nonprofit));
    } catch (e) {
        console.error(e);
        return null;
    }
}

export function parseNonprofitResult(
    nonprofit: any
): EveryNonprofitInfo {
    return {
        nonprofitID: nonprofit.nonprofitID,
        name: nonprofit.name,
        profileUrl: nonprofit.profileUrl,
        description: nonprofit.description,
        ein: nonprofit.ein,
        websiteUrl: nonprofit.websiteUrl,
        primarySlug: nonprofit.primarySlug,
        logoUrl: nonprofit.logoUrl ?? null,
        coverImageUrl: nonprofit.coverImageUrl ?? null
    };
}

export function generateEveryDonationLink(
    //webhookToken: string,
    nonprofit: EveryNonprofitInfo,
    numberOfResults: number = 5,
    ...optionalParams: [string, string][]
    ): string {
        const queryParams = new URLSearchParams(optionalParams)
        return `${nonprofit.profileUrl}#donate?take=${numberOfResults.toString()}${queryParams.toString()}`; //webhookToken=
}

export function populateNonprofitSelect(
    searchResults: string,
): { label: string, value: string }[] {
    if (searchResults.length > 0) {
        let searchResultsData: Data;
        try {
            searchResultsData = JSON.parse(searchResults);
            console.log(searchResultsData);
        } catch {
            console.error("Error parsing search results.");
            return []; // Return empty if parsing fails
        }
        return searchResultsData.nonprofits.map((nonprofit: EveryNonprofitInfo) => ({
            label: nonprofit.name,
            value: JSON.stringify(nonprofit)
        }));
    }
    return [];
}

export async function fetchFundraiserRaisedDetails(
    nonprofitIdentifier: string,
    fundraiserIdentifier: string,
    publicKey: string,
    context: Context
): Promise<EveryFundraiserRaisedDetails | null> {
    if (USE_MOCK) {
        console.log('Using mock data for fetchFundraiserRaisedDetails');
        return getMockFundraiserRaisedDetails(context);
    }
    
    const apiUrl = `https://partners.every.org/v0.2/nonprofit/${nonprofitIdentifier}/fundraiser/${fundraiserIdentifier}/raised?apiKey=${publicKey}`;

    try {
        const request = new Request(apiUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
        });
        const response = await fetch(request);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return {
            currency: data.currency,
            raised: data.raised,
            supporters: data.supporters,
            goalAmount: data.goalAmount,
            goalType: data.goalType
        };
    } catch (e) {
        console.error('Error fetching fundraiser raised details:', e);
        return null;
    }
}
