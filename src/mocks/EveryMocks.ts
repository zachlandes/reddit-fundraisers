import { Context } from '@devvit/public-api';
import { Currency, EveryExistingFundraiserInfo, EveryFundraiserInfo, EveryFundraiserRaisedDetails, EveryNonprofitInfo, FundraiserCreationResponse } from '../types/index.js';
import { getTomorrowDate } from '../utils/dateUtils.js';

const mockDescription = 
    `I am reaching out on behalf of two sweet special needs kittens in need of help: Meet Gracie and Snowflake:

    Gracie's journey has been one of immense challenge and resilience. Found on the euthanasia list due to swallowing issues, her future looked bleak.
    
    A dedicated foster volunteer saw something in her and took a chance. Despite initial hopeful evaluations, surgery revealed her condition was more complex than anticipated.
    
    Further testing, including a CT scan, showed that Gracie suffers from a rare condition causing food to potentially enter her lungs with each meal.
    
    Gracie is a happy loving kitten. She's a tiny lap cat filled with love and affection, and like many special needs pets she is seeking not pity but a chance to live.
    
    She now faces a critical moment, which I truly wish were different: without specialized surgery, euthanasia is her only other option. This surgery is her lifeline, her hope for a normal, joyful life. Gracie's prognosis is great with surgery. But, due to the rarity of her case the cost is simply not accessible for an adoptive family or for the rescue we're working with.
    
    I share this in transparency to help normalize the care of special needs pets. Gracie's surgery and care costs are just over $12,000. I know that number is incredibly high, and this is why the BUB Fund exists.
    
    If we can work together to support and normalize care for special needs pets we can help influence and create long term solutions with more accessible care. This is something deeply needed.
    
    In addition to Gracie, we're also raising funds for many other neo-natal kittens this season. Snowflake was a 21-day-old neonatal kitten found alone by a busy road.
    
    Brought to a shelter by a kind-hearted person, Snowflake needs round-the-clock care and bottle feeding. She is getting the care she needs thanks to the kindness of so many, and you are a part of both her and Gracie's stories.
    
    BUB's legacy teaches us about the importance of giving special needs pets a chance. By supporting Gracie and Snowflake, you honor BUB's spirit of overcoming adversity and helping those in need. Even more important, we help to increase awareness and change the trajectory for special needs pets. While they are often the first to face economic euthanasia we see them and know their lives have value; they are worth it.
    
    Thank you for considering supporting Gracie and Snowflake. Your generosity and action can change their world.`;


export const mockFundraiserCreationResponse: FundraiserCreationResponse = {
    id: "mock-fundraiser-id",
    nonprofitId: "mock-nonprofit-id-1",
    title: "Mock Fundraiser Title",
    description: mockDescription,
    startDate: new Date(),
    endDate: getTomorrowDate(),
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
        nonprofitID: "mock-nonprofit-id-1",
        name: "Mock Nonprofit 1",
        profileUrl: "https://mock.nonprofit1.org",
        description: "Description of Mock Nonprofit 1",
        ein: "123456789",
        websiteUrl: "https://mock.nonprofit1.org",
        primarySlug: "mock-nonprofit-1",
        logoUrl: "https://preview.redd.it/jm1soorioazc1.png?width=48&format=png&auto=webp&s=14097ee16c53b905edb4357a724794d166bf51cb",
        coverImageUrl: "https://i.redd.it/3pwwc5t0pf5d1.jpeg",
        logoCloudinaryId: "mock-logo-cloudinary-id-1"
    },
    {
        nonprofitID: "mock-nonprofit-id-2",
        name: "Mock Nonprofit 2",
        profileUrl: "https://mock.nonprofit2.org",
        description: "Description of Mock Nonprofit 2",
        ein: "987654321",
        websiteUrl: "https://mock.nonprofit2.org",
        primarySlug: "mock-nonprofit-2",
        logoUrl: "https://preview.redd.it/jm1soorioazc1.png?width=48&format=png&auto=webp&s=14097ee16c53b905edb4357a724794d166bf51cb",
        coverImageUrl: "https://i.redd.it/3pwwc5t0pf5d1.jpeg",
        logoCloudinaryId: "mock-logo-cloudinary-id-2"
    }
];

export const getMockFundraiserRaisedDetails = async (
    context: Pick<Context, "redis" | "postId">
): Promise<EveryFundraiserRaisedDetails> => {
    const { postId, redis } = context;
    const key = `fundraiser-raised-amount-${postId}`;
    const initialAmount = 100;
    const incrementAmount = 20;
    const ttl = 600; // TTL in seconds (10 minutes)

    // Check if the key exists
    const exists = await redis.get(key);
    if (!exists) {
        // Set initial amount if key does not exist
        await redis.set(key, initialAmount.toString());
        await redis.expire(key, ttl);
        console.log("Key set with initial amount:", initialAmount);
    }

    // Increment the raised amount atomically
    const newRaisedAmount = await redis.incrBy(key, incrementAmount);
    console.log("Incremented raised amount by", incrementAmount, ", new raised amount:", newRaisedAmount);

    return {
        currency: "USD",
        raised: newRaisedAmount,
        supporters: 50,
        goalAmount: 10000,
        goalType: "fixed"
    };
};

export const mockExistingFundraiserDetails: EveryExistingFundraiserInfo = {
    entityName: "Mock Nonprofit 1",
    id: "mock-fundraiser-id",
    createdAt: new Date("2023-01-01T00:00:00.000Z"),
    nonprofitId: "mock-nonprofit-id-1",
    creatorUserId: "mock-user-id",
    creatorNonprofitId: "mock-nonprofit-id-1",
    slug: "mock-fundraiser-slug",
    title: "Mock Fundraiser Title",
    description: "Mock description",
    active: true,
    startDate: new Date("2023-01-01T00:00:00.000Z"),
    endDate: getTomorrowDate(),
    pinnedAt: null,
    goalAmount: 10000,
    goalCurrency: Currency.USD,
    metadata: {
        donationThankYouMessage: "Thank you for supporting this fundraiser!"
    },
    parentFundraiserId: null,
    childrenFundraiserIds: [],
    eventIds: [],
    coverImageCloudinaryId: "https://i.redd.it/3pwwc5t0pf5d1.jpeg"
};
