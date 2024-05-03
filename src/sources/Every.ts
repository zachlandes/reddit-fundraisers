import { Context, Data, Devvit, SettingsClient } from '@devvit/public-api';

export enum APIService {
    EVERY = `partners.every.org`
}

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
    logoUrl: string,
    coverImageUrl: string,
}

export async function fetchNonprofits<T extends GeneralNonprofitInfo>(
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
): GeneralNonprofitInfo {
    const nonprofitInfo: GeneralNonprofitInfo = {
        name: nonprofit.name,
        profileUrl: nonprofit.profileUrl,
        description: nonprofit.description,
        ein: nonprofit.ein,
        websiteUrl: nonprofit.websiteUrl
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
): GeneralNonprofitInfo[] {
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
        const nonprofitInfos = searchResultsData.nonprofits as GeneralNonprofitInfo[];
        return nonprofitInfos;
    }
    return [];
}
