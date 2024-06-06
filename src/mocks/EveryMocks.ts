import { Context } from '@devvit/public-api';
import { Currency, EveryFundraiserInfo, EveryFundraiserRaisedDetails, EveryNonprofitInfo, FundraiserCreationResponse } from '../types/index.js';

export const mockFundraiserCreationResponse: FundraiserCreationResponse = {
    id: "mock-fundraiser-id",
    nonprofitId: "mock-nonprofit-id",
    title: "Mock Fundraiser Title",
    description: "Mock description",
    startDate: new Date(),
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)),  // Tomorrow's date 
    goal: 10000,
    raisedOffline: null,
    currency: Currency.USD,
    amountRaised: 0,
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    updatedAt: new Date("2023-01-01T00:00:00.000Z"),
    links: {
        self: "https://mockapi.every.org/v0.2/fundraiser/mock-fundraiser-id",
        web: "https://every.org/fundraiser/mock-fundraiser-id"
    }
};

export const mockNonprofits: EveryNonprofitInfo[] = [
    {
        name: "Mock Nonprofit 1",
        profileUrl: "https://mock.nonprofit1.org",
        description: "Description of Mock Nonprofit 1",
        ein: "123456789",
        websiteUrl: "https://mock.nonprofit1.org",
        primarySlug: "mock-nonprofit-1",
        logoUrl: null,
        coverImageUrl: "https://preview.redd.it/prochoice-activism-in-atlanta-ga-chomp-stomp-festival-nov-v0-1iv7quw5ocy91.jpg"
    },
    {
        name: "Mock Nonprofit 2",
        profileUrl: "https://mock.nonprofit2.org",
        description: "Description of Mock Nonprofit 2",
        ein: "987654321",
        websiteUrl: "https://mock.nonprofit2.org",
        primarySlug: "mock-nonprofit-2",
        logoUrl: null,
        coverImageUrl: "https://preview.redd.it/prochoice-activism-in-atlanta-ga-chomp-stomp-festival-nov-v0-1iv7quw5ocy91.jpg"
    }
];

export const getMockFundraiserRaisedDetails = async (context: Context): Promise<EveryFundraiserRaisedDetails> => {
    const key = 'fundraiser-raised-amount';
    const initialAmount = 100;
    const incrementAmount = 20;
    const ttl = 600; // TTL in seconds (10 minutes)

    // Check if the key exists
    const exists = await context.redis.get(key);
    if (!exists) {
        // Set initial amount if key does not exist
        await context.redis.set(key, initialAmount.toString());
        await context.redis.expire(key, ttl);
        console.log("Key set with initial amount:", initialAmount);
    }

    // Increment the raised amount atomically
    const newRaisedAmount = await context.redis.incrBy(key, incrementAmount);
    console.log("Incremented raised amount by", incrementAmount, ", new raised amount:", newRaisedAmount);

    return {
        currency: "USD",
        raised: newRaisedAmount,
        supporters: 50,
        goalAmount: 10000,
        goalType: "fixed"
    };
};
