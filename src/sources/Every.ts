import { Context, Data, Devvit, SettingsClient } from '@devvit/public-api';
import { Currency, EveryFundraiserInfo, EveryNonprofitInfo } from '../types/index.js';

export enum APIService {
    EVERY = `partners.every.org`
}

export async function createFundraiser(
    fundraiserInfo: EveryFundraiserInfo,
    publicKey: string,
    privateKey: string 
): Promise<void> {
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

        console.log('Fundraiser created successfully');
    } catch (e) {
        console.error('Error creating fundraiser:', e); // FIXME: move logging to the calling function try-catch block
        throw e;
    }
}



export async function fetchNonprofits<T extends EveryNonprofitInfo>(
    query: string,
    publicKey: string
): Promise<T[] | null> {
    const apiUrl = `https://partners.every.org/v0.2/search/${query}?apiKey=${publicKey}`;
    let data;

    try {
        const request = new Request(apiUrl, {
            headers: { Accept: 'application/json' },
        });
        const res = await fetch(request);
        data = await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }

    const nonprofits: T[] = [];
    data['nonprofits'].forEach((nonprofit: unknown) => {
        nonprofits.push(parseNonprofitResult(nonprofit) as T)
    });
    return nonprofits;
}

export function parseNonprofitResult(
    nonprofit: unknown
): EveryNonprofitInfo {
    const coverImageUrlSafe = nonprofit.coverImageUrl ?? null;
    const logoUrlSafe = nonprofit.logoUrl ?? null;

    const nonprofitInfo: EveryNonprofitInfo = {
        name: nonprofit.name,
        profileUrl: nonprofit.profileUrl,
        description: nonprofit.description,
        ein: nonprofit.ein,
        websiteUrl: nonprofit.websiteUrl,
        coverImageUrl: coverImageUrlSafe,
        logoUrl: logoUrlSafe
    };

    return nonprofitInfo;
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
): EveryNonprofitInfo[] {
    // take search term and validate
    if (searchResults.length > 0) {
        let searchResultsData: Data;
        try {
            searchResultsData = JSON.parse(searchResults);
            console.log(searchResultsData);
        }
        catch {
            return []; //FIXME:
        }
        // Return a list of objects
        // return [{}]  // This is our options
        const nonprofitInfos = searchResultsData.nonprofits as EveryNonprofitInfo[];
        return nonprofitInfos;
    }
    return [];
}

export async function fetchFundraiserRaisedDetails(
    nonprofitIdentifier: string,
    fundraiserIdentifier: string,
    publicKey: string
): Promise<{ currency: string; raised: number; supporters: number; goalAmount: number; goalType: string } | null> { //FIXME: turn this return into a reusable type
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
