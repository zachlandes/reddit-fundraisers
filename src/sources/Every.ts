import { Context, Devvit, SettingsClient } from '@devvit/public-api';

export enum APIService {
    EVERY = `every.org`
}

export type GeneralNonprofitInfo = {
    name: string,
    profileUrl: string,
    description: string,
    ein: string,
    websiteUrl: string
};

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
    return nonprofits
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

    return nonprofitInfo
}
