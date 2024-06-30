import { Context, Data, Devvit, SettingsClient } from '@devvit/public-api';
import { Currency, EveryFundraiserInfo, EveryFundraiserRaisedDetails, EveryNonprofitInfo, FundraiserCreationResponse, EveryExistingFundraiserInfo } from '../types/index.js';
import { mockFundraiserCreationResponse, mockNonprofits, getMockFundraiserRaisedDetails, mockExistingFundraiserDetails } from '../mocks/index.js';
import { convertToDate } from '../utils/dateUtils.js';

const USE_MOCK = false; // Toggle this to false to use real API calls

export enum APIService {
    EVERY = `partners.every.org`
}

/**
 * Creates a new fundraiser using the Every.org API.
 * @param fundraiserInfo - Information about the fundraiser to be created.
 * @param publicKey - Public API key for authentication.
 * @param privateKey - Private API key for authentication.
 * @returns A promise that resolves to the creation response of the fundraiser.
 */
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

/**
 * Fetches a list of nonprofits based on a search query.
 * @param query - The search term used to find nonprofits.
 * @param publicKey - Public API key for authentication.
 * @returns A promise that resolves to an array of nonprofit information or null if an error occurs.
 */
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
        const error = e as Error;
        console.error(`Error fetching nonprofits with query "${query}":`, error.message || error.toString());
        return null;
    }
}

/**
 * Parses the raw nonprofit data from the API into a structured EveryNonprofitInfo object.
 * This function takes the JSON object representing a nonprofit and converts it into a 
 * structured format that is easier to work with within the application.
 *
 * @param nonprofit - The raw JSON object representing a nonprofit from the API.
 * @returns A structured EveryNonprofitInfo object containing the nonprofit's details.
 */
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
        coverImageUrl: nonprofit.coverImageUrl ?? null,
        logoCloudinaryId: nonprofit.logoCloudinaryId ?? null // Expect this to be null from the nonprofit search endpoint
    };
}

/**
 * Generates a profile URL for a nonprofit based on its primary slug.
 * @param primarySlug - The primary slug of the nonprofit.
 * @returns The full URL to the nonprofit's profile on Every.org.
 */
function generateProfileUrl(primarySlug: string): string {
    return `https://every.org/${primarySlug}`;
}

/**
 * Generates a donation link for a nonprofit on Every.org.
 * @param nonprofit - The nonprofit information object.
 * @param numberOfResults - The number of results to display, defaults to 5.
 * @param optionalParams - Additional parameters as key-value pairs.
 * @returns A formatted URL string for donations.
 */
export function generateEveryDonationLink(
    //webhookToken: string,
    nonprofit: EveryNonprofitInfo,
    numberOfResults: number = 5,
    ...optionalParams: [string, string][]
): string {
    const queryParams = new URLSearchParams(optionalParams)
    return `${nonprofit.profileUrl}#donate?take=${numberOfResults.toString()}${queryParams.toString()}`;
}

/**
 * Converts search results into a selectable format for UI field dropdowns.
 * @param searchResults - The JSON string of search results.
 * @returns An array of objects with label and value properties for use in select components.
 */
export function populateNonprofitSelect(
    searchResults: string,
): { label: string, value: string }[] {
    if (searchResults.length > 0) {
        let searchResultsData: Data;
        try {
            searchResultsData = JSON.parse(searchResults);
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

/**
 * Fetches the raised details for a specific fundraiser.
 * @param nonprofitIdentifier - The identifier of the nonprofit associated with the fundraiser.
 * @param fundraiserIdentifier - The identifier of the fundraiser.
 * @param publicKey - Public API key for authentication.
 * @param context - The context object.
 * @returns A promise that resolves to the raised details of the fundraiser or null if an error occurs.
 */
export async function fetchFundraiserRaisedDetails(
    nonprofitIdentifier: string,
    fundraiserIdentifier: string,
    publicKey: string,
    context: Pick<Context, "redis" | "postId">
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

/**
 * Fetches the details of an existing fundraiser.
 * @param nonprofitIdentifier - The identifier of the nonprofit associated with the fundraiser.
 * @param fundraiserIdentifier - The identifier of the fundraiser.
 * @param publicKey - Public API key for authentication.
 * @returns A promise that resolves to an object containing the fundraiser information and associated nonprofit information, or null if an error occurs.
 */
export async function fetchExistingFundraiserDetails(
    nonprofitIdentifier: string,
    fundraiserIdentifier: string,
    publicKey: string
): Promise<{ fundraiserInfo: EveryExistingFundraiserInfo, nonprofitInfo: EveryNonprofitInfo } | null> {
    if (USE_MOCK) {
        console.log('Using mock data for fetchExistingFundraiserDetails');
        return Promise.resolve({
            fundraiserInfo: mockExistingFundraiserDetails,
            nonprofitInfo: mockNonprofits[0] 
        });
    }

    const apiUrl = `https://partners.every.org/v0.2/nonprofit/${nonprofitIdentifier}/fundraiser/${fundraiserIdentifier}?apiKey=${publicKey}`;

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
        const fundraiser = data.data.fundraiser;
        const nonprofit = data.data.nonprofits[0]; // Assuming the first nonprofit is the one we want //FIXME: Look into whether this is a good assumption

        return {
            fundraiserInfo: {
                entityName: fundraiser.entityName,
                id: fundraiser.id,
                createdAt: convertToDate(fundraiser.createdAt),
                nonprofitId: fundraiser.nonprofitId,
                creatorUserId: fundraiser.creatorUserId,
                creatorNonprofitId: fundraiser.creatorNonprofitId,
                slug: fundraiser.slug,
                title: fundraiser.title,
                description: fundraiser.description,
                active: fundraiser.active,
                startDate: fundraiser.startDate ? convertToDate(fundraiser.startDate) : null,
                endDate: fundraiser.endDate ? convertToDate(fundraiser.endDate) : null,
                pinnedAt: fundraiser.pinnedAt ? convertToDate(fundraiser.pinnedAt) : null,
                goalAmount: parseInt(fundraiser.goalAmount),
                goalCurrency: fundraiser.goalCurrency,
                metadata: {
                    donationThankYouMessage: fundraiser.metadata.donationThankYouMessage,
                },
                parentFundraiserId: fundraiser.parentFundraiserId,
                childrenFundraiserIds: fundraiser.childrenFundraiserIds,
                eventIds: fundraiser.eventIds,
                coverImageCloudinaryId: fundraiser.coverImageCloudinaryId
            } as EveryExistingFundraiserInfo,
            nonprofitInfo: {
                nonprofitID: nonprofit.id,
                name: nonprofit.name,
                profileUrl: generateProfileUrl(nonprofit.primarySlug),
                description: nonprofit.description,
                ein: nonprofit.ein,
                websiteUrl: nonprofit.websiteUrl,
                primarySlug: nonprofit.primarySlug,
                logoCloudinaryId: nonprofit.logoCloudinaryId,
            } as EveryNonprofitInfo,
        };
    } catch (e) {
        console.error('Error fetching fundraiser details:', e);
        return null;
    }
}