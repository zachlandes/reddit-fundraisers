import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, EveryFundraiserRaisedDetails, SerializedFundraiserCreationResponse, EveryNonprofitInfo, EveryExistingFundraiserInfo, SerializedEveryExistingFundraiserInfo } from '../types/index.js';
import { getCachedForm } from '../utils/Redis.js';
import { TypeKeys } from '../utils/typeHelpers.js';
import { getEveryPublicKey } from '../utils/keyManagement.js';
import { serializeFundraiserCreationResponse, serializeExistingFundraiserResponse } from '../utils/dateUtils.js';
import { usePagination } from '@devvit/kit';
import { paginateText } from '../utils/renderUtils.js';
import pixelWidth from 'string-pixel-width';
import { fetchExistingFundraiserDetails } from '../sources/Every.js';
import { ImageManager } from '../utils/imageUtils.js';

function generateFundraiserURL(fundraiserInfo: SerializedEveryExistingFundraiserInfo | null, nonprofitInfo: EveryNonprofitInfo | null): string {
  if (!fundraiserInfo) return ''; // TODO: better default?
  return `https://every.org/${nonprofitInfo?.primarySlug}/f/${fundraiserInfo.slug}?viewport=desktop#/donate`; //FIXME: viewport=dynamic value?
}

export function FundraiserView(
  fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
  raised: number,
  goal: number | null,
  goalType: string,
  context: Context,
  width: number,
  totalHeight: number,
  nonprofitInfo: EveryNonprofitInfo | null,
  charWidth: number,
  coverImageUrl: string | null,
  logoImageUrl: string | null,
  fundraiserURL: string
): JSX.Element {
    const { ui } = context;
    const descriptionMaxHeight = totalHeight - 190;
    const lineHeight = 17;
    const lineWidth = width + 60;
    const imageHeight = 150; // Height of the cover image
    const logoHeight = 35; // Height of the logo image
    const descriptionContainerMaxHeight = descriptionMaxHeight - imageHeight - logoHeight;
    const descriptionPages = fundraiserInfo
        ? paginateText(fundraiserInfo.description, descriptionMaxHeight-20, lineHeight, lineWidth, charWidth, imageHeight, logoHeight)
        : ['Loading description...'];

    const { currentPage, currentItems, toNextPage, toPrevPage } = usePagination(context, descriptionPages, 1);

    const magicWidthPercentageProgressBar = 97;

    return (
        <vstack width={`${width}px`}>
            <vstack width="100%" alignment='center middle'>
              {/* COVER IMAGE */}
              <image
                  url={coverImageUrl ? coverImageUrl : 'placeholder-image-url'}
                  width="100%"
                  imageWidth={`${width}px`}
                  imageHeight={`${imageHeight}px`}
                  resizeMode="cover"
                  description="Fundraiser Image"
              />
            </vstack>
            <spacer size='small' />
            <hstack alignment='middle'>
              {/* LOGO, NONPROFIT NAME */}
              <spacer size='medium' />
              <image
                  url={logoImageUrl ? logoImageUrl : 'loading_logo.png'}
                  imageWidth={"35px"}
                  imageHeight={`${logoHeight}px`}
                  description="Nonprofit Logo"
              />
              <text weight='bold' onPress={() => {
                if (nonprofitInfo?.profileUrl) {
                  ui.navigateTo(nonprofitInfo.profileUrl);
                }
              }}>
                {nonprofitInfo?.name}
              </text>
              <spacer size='medium' />
            </hstack>
            <hstack>
              {/* FUNDRAISER TITLE */}
              <spacer size='medium' />
              <vstack width='100%' alignment='start middle'>
                  <text size="xlarge">
                    {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
                  </text>
              </vstack>
            </hstack>
            <hstack>
              {/* PAGINATED FUNDRAISER DESC */}
              <spacer size='medium' />
              <vstack width='100%' minHeight={`${descriptionContainerMaxHeight}px`} maxHeight={`${descriptionContainerMaxHeight}px`} padding="xsmall">
                  {currentItems.map((page, index) => (
                      <text key={index.toString()} size='small' wrap overflow="ellipsis">
                          {page}
                      </text>
                  ))}
              </vstack>
            </hstack>
            <hstack alignment="start middle" gap="small">
              {/* PAGINATION UI */}
              <spacer size='medium' />
              <button onPress={toPrevPage} icon="left" disabled={currentPage === 0} />
              <text>{currentPage + 1}</text>
              <button onPress={toNextPage} icon="right" disabled={descriptionPages.length <= 1 || currentPage === descriptionPages.length - 1} />
            </hstack>
            <spacer size='small' />
            <vstack width={`${magicWidthPercentageProgressBar}%`}>
              <hstack>
                {/* PROGRESS BAR LABELS */}
                <spacer size='medium' />
                <hstack width={`${magicWidthPercentageProgressBar - 50}%`} alignment='start'>
                    <vstack>
                        <text weight='bold'>${new Intl.NumberFormat('en-US').format(raised / 100)}</text>  {/* comes in as cents, formatted with commas */}
                        <text color='#706E6E'>Raised</text>
                    </vstack>
                </hstack>
                <hstack width='50%' alignment='end'>
                  <spacer size='medium' />
                  <vstack alignment='end'>
                      <text weight='bold'>${goal ? new Intl.NumberFormat('en-US').format(goal / 100) : new Intl.NumberFormat('en-US').format(raised / 100)}</text> {/* comes in as cents, formatted with commas */}
                      {goalType && (
                        <text color='#706E6E'>
                          {goalType === 'AUTOMATIC' ? 'Next milestone' : 'Goal'}
                        </text>
                      )}
                  </vstack>
                </hstack>
              </hstack>
              <hstack>
                <spacer size='medium' />
                <vstack backgroundColor='#f3f7f7' cornerRadius='full' width={`${magicWidthPercentageProgressBar}%`}>
                  {/* PROGRESS BAR */}
                  <hstack backgroundColor='#008A10' width={`${goal ? (raised / goal) * 100 : 0}%`}>
                    <spacer size='medium' shape='square' />
                  </hstack>
                </vstack>
              </hstack>
            </vstack>
            <spacer size='small' />
            <vstack alignment='center middle' width='100%'>
              {/* DONATE BUTTON */}
                <button appearance='success' width='100%' maxWidth={30} onPress={() => {
                  if (fundraiserInfo) {
                    context.ui.navigateTo(fundraiserURL);
                  }
                }}>Donate</button>
            </vstack>
        </vstack>
    )
}

export const FundraiserPost: CustomPostType = {
  name: "FundraiserPost",
  description: "Post fundraiser",
  height: "tall",
  render: async context => {
    const { height, width } = context.dimensions ?? { height: 480, width: 320 }; // Default dimensions if not provided
    console.log("Starting render of FundraiserPost with dimensions:", { height, width });

    const { postId, useChannel, useState } = context;

    if (typeof postId !== 'string') {
      throw new Error('postId is undefined');
    }

    const cachedPostData = await getCachedForm(context, postId).catch(error => {
      console.error(`Failed to retrieve cached form for postId: ${postId}`, error);
      return null;
    });
    if (!cachedPostData) {
      console.error(`No cached form found for postId: ${postId}`);
    }
    const initialFundraiserInfo = cachedPostData ? cachedPostData.getAllProps(TypeKeys.everyExistingFundraiserInfo) : null;
    const fundraiserRaisedDetails = cachedPostData ? cachedPostData.getAllProps(TypeKeys.fundraiserDetails) : null;
    const initialNonprofitInfo = cachedPostData ? cachedPostData.getAllProps(TypeKeys.everyNonprofitInfo) : null;

    const [fundraiserInfo, setFundraiserInfo] = useState<SerializedEveryExistingFundraiserInfo | null>(
      initialFundraiserInfo ? serializeExistingFundraiserResponse(initialFundraiserInfo) : null
    );
    const [goalType, setGoalType] = useState<string>(fundraiserRaisedDetails ? fundraiserRaisedDetails.goalType : ''); //FIXME: handle null/empty goal type including render
    const [raised, setRaised] = useState<number>(fundraiserRaisedDetails ? fundraiserRaisedDetails.raised : 0);
    const [goal, setGoal] = useState<number | null>(fundraiserRaisedDetails ? fundraiserRaisedDetails.goalAmount : null);
    const [nonprofitInfo, setNonprofitInfo] = useState<EveryNonprofitInfo | null>(initialNonprofitInfo);

    const publicKey = await getEveryPublicKey(context);

    let coverImageUrl: string | null = null;
    let logoImageUrl: string | null = null;
    if (nonprofitInfo && initialFundraiserInfo) {
      const existingFundraiserDetails = await fetchExistingFundraiserDetails(
        nonprofitInfo.nonprofitID,
        initialFundraiserInfo.id,
        publicKey
      );
      const coverImagePath = existingFundraiserDetails?.fundraiserInfo.coverImageCloudinaryId ?? null;
      const logoImagePath = existingFundraiserDetails?.nonprofitInfo.logoCloudinaryId ?? null;
      console.log("cloudinary coverImageId: ", coverImagePath);
      console.log("cloudinary logoImageId: ", logoImagePath);
      const imageManager = new ImageManager(context);
      if (coverImagePath !== null) {
        coverImageUrl = await imageManager.getImageUrl(coverImagePath, width);
        console.log(`cover image url: ${coverImageUrl}`)
      } else {
        coverImageUrl = null;
      }
      if (logoImagePath !== null) {
        logoImageUrl = await imageManager.getLogoUrl(logoImagePath);
        console.log(`logo image url: ${logoImageUrl}`)
      } else {
        logoImageUrl = null;
      }
    }

    const [coverImageUrlState, setCoverImageUrl] = useState<string | null>(coverImageUrl);
    const [logoImageUrlState, setLogoImageUrl] = useState<string | null>(logoImageUrl);

    // Initialize fundraiserURL state
    const fundraiserUrl = generateFundraiserURL(fundraiserInfo, nonprofitInfo);
    const [fundraiserURL, setFundraiserURL] = useState<string>(fundraiserUrl);

    // Subscribe to real-time updates for live changes to the raised amount
    const updateChannel = useChannel({
      name: 'fundraiser_updates',
      onMessage: (data) => {
        console.log("Received message on fundraiser_updates channel:", data);
        if (data.postId === postId && data.updatedDetails) {
          if (data.updatedDetails.raised !== undefined && data.updatedDetails.raised !== fundraiserRaisedDetails?.raised) {
            console.log('Received update for raised amount:', data.updatedDetails.raised);
            setRaised(data.updatedDetails.raised);
          }
          if (data.updatedDetails.goalAmount !== undefined && data.updatedDetails.goalAmount !== fundraiserRaisedDetails?.goalAmount) {
            console.log('Received update for goal amount:', data.updatedDetails.goalAmount);
            setGoal(data.updatedDetails.goalAmount);
          }
        }
      }
    });
    updateChannel.subscribe();

    // Measure character width using string-pixel-width with a supported font
    const fontStack = "arial";
    const charWidth = pixelWidth('0', { font: fontStack, size: 12 });

    return (
      <blocks>
        {FundraiserView(fundraiserInfo, raised, goal, goalType, context, width, height, nonprofitInfo, charWidth, coverImageUrlState, logoImageUrlState, fundraiserURL)}
      </blocks>
    );
  }
}