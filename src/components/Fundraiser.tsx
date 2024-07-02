import { Context, CustomPostType, Devvit, JSONValue, JSONObject } from '@devvit/public-api';
import { EveryFundraiserRaisedDetails, EveryNonprofitInfo, SerializedEveryExistingFundraiserInfo } from '../types/index.js';
import { getCachedForm, removePostAndFormFromRedis } from '../utils/Redis.js';
import { TypeKeys } from '../utils/typeHelpers.js';
import { getEveryPublicKey } from '../utils/keyManagement.js';
import { serializeExistingFundraiserResponse } from '../utils/dateUtils.js';
import { usePagination } from '@devvit/kit';
import { paginateText } from '../utils/renderUtils.js';
import pixelWidth from 'string-pixel-width';
import { fetchExistingFundraiserDetails } from '../sources/Every.js';
import { ImageManager } from '../utils/imageUtils.js';
import { FancyButton } from './FancyButton.js';
import { CircularLogo } from './CircularLogo.js';
import { Watermark } from './Watermark.js';

const DEBUG_MODE = false; // Toggle this value manually and re-upload to see changes

interface FundraiserState extends JSONObject {
  fundraiserInfo: SerializedEveryExistingFundraiserInfo | null;
  goalType: string;
  raised: number;
  goal: number | null;
  nonprofitInfo: EveryNonprofitInfo | null;
  supporters: number;
}

function generateFundraiserURL(fundraiserInfo: SerializedEveryExistingFundraiserInfo | null, nonprofitInfo: EveryNonprofitInfo | null): string {
  if (!fundraiserInfo) return ''; // TODO: better default?
  return `https://every.org/${nonprofitInfo?.primarySlug}/f/${fundraiserInfo.slug}#/donate/pay`; //FIXME: dynamic value?
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
  coverImageUrl: string | null,
  logoImageUrl: string | null,
  fundraiserURL: string,
  supporters: number
): JSX.Element {
    const { ui, useState } = context;

    const [isOverlayExpanded, setIsOverlayExpanded] = useState(false);
    const fundraiserInfoHeight = Math.floor(totalHeight * 0.44); 
    const titleHeight = 26; 
    const lineHeight = 16;
    const lineWidth = 393 - 80;
    const imageHeight = 150;
    const overlayPaginationControlHeight = 30;
    const paddingHeight = 16; // 8px top + 8px bottom for small padding
    const xsmallSpacerHeight = 4
    const coverImageHeight = Math.floor(totalHeight * 0.30);
    const bottomSectionHeight = totalHeight - fundraiserInfoHeight - coverImageHeight;
    const overlayDescriptionMaxHeight = totalHeight - overlayPaginationControlHeight;

    const descriptionMaxHeight = fundraiserInfoHeight - titleHeight - 34;
    const availableDescriptionHeight = descriptionMaxHeight - paddingHeight - 2*xsmallSpacerHeight;
    const everyGreen = '#018669';
    const borderGray = '#C0C0C0'; //'#A0A0A0'; 
    
    const fontSize = 12;
    const fontFamily = "helvetica";
    const sampleText = fundraiserInfo?.description.slice(0, 100) || 'Sample Text';
    const charWidth = pixelWidth(sampleText, { font: fontFamily, size: fontSize } ) / sampleText.length;
    console.log("charWidth: ", charWidth);
    
    const descriptionPages = fundraiserInfo
        ? paginateText(fundraiserInfo.description, overlayDescriptionMaxHeight, lineHeight, lineWidth, charWidth)
        : ['Loading description...'];

    const { currentPage, currentItems, toNextPage, toPrevPage, pagesCount } = usePagination(context, descriptionPages, 1);

    const smallPaginatedDescription = paginateText(fundraiserInfo?.description || '', availableDescriptionHeight+lineHeight, lineHeight, lineWidth, charWidth);

    const showExpandButton = smallPaginatedDescription.length > 1;

    const displayDescription = showExpandButton
      ? smallPaginatedDescription[0].replace(/\s+$/, '') + '...'
      : smallPaginatedDescription[0];

    const magicWidthPercentageProgressBar = 97;

    const handleExpandOverlay = () => {
        console.log("Expand button clicked");
        setIsOverlayExpanded(true);
    };

    const handleCloseOverlay = () => {
        console.log("Close button clicked");
        setIsOverlayExpanded(false);
    };

function renderProgressBar() {
    const barHeight = 12; // Total height of the progress bar
    const shadowHeight = 2; // Height of the shadow in pixels
    const progressPercentage = goal ? (raised / goal) * 100 : 0;
    const backgroundColor = '#f3f7f7';
    const shadowColor = 'rgba(0,0,0,0.1)';

    return (
        <vstack backgroundColor={backgroundColor} cornerRadius='full' width={`${magicWidthPercentageProgressBar}%`} height={`${barHeight}px`} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <zstack width="100%" height="100%">
                {/* Background with shadow */}
                <vstack width="100%" height="100%">
                    <hstack backgroundColor={shadowColor} height={`${shadowHeight}px`} />
                    <hstack backgroundColor={backgroundColor} grow />
                </vstack>
                {/* Progress bar */}
                <hstack backgroundColor={everyGreen} width={`${progressPercentage}%`} height="100%" />
            </zstack>
        </vstack>
    );
}

    function renderDescriptionOverlay() {
        if (!isOverlayExpanded) return null;
        return (
            <vstack maxWidth='393px' width={100} height={100} borderColor={borderGray} border='thin' backgroundColor="neutral-background">
                <vstack width={100} height={100} padding="medium">
                    <hstack width={100} alignment="end">
                        <button onPress={handleCloseOverlay} icon="close" size='small'/>
                    </hstack>
                    <spacer size='xsmall' />
                    <vstack grow>
                        <text size='small' wrap={true} color='neutral-content'>
                            {currentItems[0]}
                        </text>
                    </vstack>
                    <hstack alignment="center middle" gap="small" width={100}>
                        <button onPress={toPrevPage} icon="left" disabled={currentPage === 0} size="small" />
                        <text color='white'>{currentPage + 1} / {pagesCount}</text>
                        <button onPress={toNextPage} icon="right" disabled={currentPage === pagesCount - 1} size="small" />
                    </hstack>
                </vstack>
            </vstack>
        );
    }

    return (
      <zstack width="100%" height={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'} alignment='center' grow>
        <vstack maxWidth={'393px'} height={100} width={100} borderColor={borderGray} border='thin'>
          <vstack width="100%" maxHeight={`${coverImageHeight}px`} alignment='center middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <image
                url={coverImageUrl ? coverImageUrl : 'placeholder-image-url'}
                width="100%"
                imageWidth={`${width}px`}
                imageHeight={`${imageHeight}px`}
                resizeMode="cover"
                description="Fundraiser Image"
            />
          </vstack>
          <vstack width="100%" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} height={`${fundraiserInfoHeight}px`} border={DEBUG_MODE ? 'thin' : 'none'}>
            <hstack alignment='middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'} padding="xsmall">
              <spacer size='xsmall' />
              <CircularLogo
                url={logoImageUrl ? logoImageUrl : 'loading_logo.png'}
                size={35}
                description="Nonprofit Logo"
                onPress={() => {
                  if (nonprofitInfo?.profileUrl) {
                    ui.navigateTo(nonprofitInfo.profileUrl);
                  }
                }}
              />
              <spacer size='xsmall' />
              <text weight='bold' onPress={() => {
                if (nonprofitInfo?.profileUrl) {
                  ui.navigateTo(nonprofitInfo.profileUrl);
                }
              }}>
                {nonprofitInfo?.name}
              </text>
              <spacer size='medium' />
            </hstack>
            <vstack width={100} maxHeight={`${fundraiserInfoHeight}px`} grow borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <spacer size='xsmall' />
              <hstack width={100} maxHeight={`${titleHeight}px`} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <spacer size='small' />
                <text size="large" weight='bold'>
                  {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
                </text>
                <spacer grow />
              </hstack>
              <vstack width={100} maxHeight={`${descriptionMaxHeight}px`} grow padding="small" borderColor={DEBUG_MODE ? 'blue' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <text
                    size='small'
                    wrap={true}
                    maxHeight={`${availableDescriptionHeight}px`}
                >
                  {fundraiserInfo ? displayDescription : 'Loading description...'}
                </text>
                {showExpandButton &&
                (<spacer size='xsmall' />)}
                {showExpandButton && (
                  <text size='small' weight='bold' color={everyGreen} onPress={handleExpandOverlay}>Read more</text>
                )}
                <spacer size='small' />
              </vstack>
            </vstack>
          </vstack>
          <vstack width={100} grow borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <spacer size='xsmall' />
            <vstack width={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <hstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <spacer grow />
                <hstack width={`${magicWidthPercentageProgressBar/2}%`} alignment='start' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                    <vstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                        <text weight='bold'>${new Intl.NumberFormat('en-US').format(raised / 100)}</text>
                        <text color='#706E6E'>Raised</text>
                    </vstack>
                </hstack>
                <hstack width={`${magicWidthPercentageProgressBar/2}%`} alignment='end' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <spacer size='medium' />
                  <vstack alignment='end' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                      <text weight='bold'>${goal ? new Intl.NumberFormat('en-US').format(goal / 100) : new Intl.NumberFormat('en-US').format(raised / 100)}</text>
                      {goalType && (
                        <text color='#706E6E'>
                          {goalType === 'AUTOMATIC' ? 'Next milestone' : 'Goal'}
                        </text>
                      )}
                  </vstack>
                </hstack>
                <spacer grow />
              </hstack>
              <hstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <spacer grow />
                {renderProgressBar()}
                <spacer grow />
              </hstack>
            </vstack>
            <vstack width={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <spacer grow />
              <hstack width='100%' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <hstack width='33%' alignment='start top' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <spacer size='small' />
                  <vstack alignment='start top'>
                    <text size='small' weight='bold'>
                      {supporters === 0 ? "Be the first to donate!" : `${new Intl.NumberFormat('en-US').format(supporters)} Supporters`}
                    </text>
                  </vstack>
                </hstack>
                <hstack width='34%' alignment='center middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <FancyButton
                    backgroundColor={everyGreen}
                    textColor="white"
                    height={40}
                    onPress={() => {
                      if (fundraiserInfo) {
                        console.log("Navigating to fundraiser URL:", fundraiserURL);
                        context.ui.navigateTo(fundraiserURL);
                      }
                    }}
                  >
                    Donate
                  </FancyButton>
                </hstack>
                <hstack width='33%' alignment='end middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <spacer grow />
                </hstack>
                <hstack width='33%' alignment='end middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                </hstack>
              </hstack>
            </vstack>
            <Watermark />
          </vstack>
        </vstack>
        {renderDescriptionOverlay()}
      </zstack>
    );
}

export const FundraiserPost: CustomPostType = {
  name: "FundraiserPost",
  description: "Post fundraiser",
  height: "tall",
  render: async context => {
    const { height, width } = context.dimensions ?? { height: 480, width: 320 };
    console.log("Starting render of FundraiserPost with dimensions:", { height, width });

    const { postId, useChannel, useState } = context;

    if (typeof postId !== 'string') {
      throw new Error('postId is undefined');
    }

    const [state, setState] = useState<FundraiserState>(async () => {
      const initialState: FundraiserState = {
        fundraiserInfo: null,
        goalType: '',
        raised: 0,
        goal: null,
        nonprofitInfo: null,
        supporters: 0
      };

      try {
        const cachedData = await getCachedForm(context, postId);
        if (cachedData) {
          const fundraiserRaisedDetails = cachedData.getAllProps(TypeKeys.fundraiserDetails);
          const everyExistingFundraiserInfo = cachedData.getAllProps(TypeKeys.everyExistingFundraiserInfo);
          const nonprofitInfo = cachedData.getAllProps(TypeKeys.everyNonprofitInfo);

          return {
            fundraiserInfo: everyExistingFundraiserInfo ? serializeExistingFundraiserResponse(everyExistingFundraiserInfo) : null,
            goalType: fundraiserRaisedDetails?.goalType ?? '',
            raised: fundraiserRaisedDetails?.raised ?? 0,
            goal: fundraiserRaisedDetails?.goalAmount ?? null,
            nonprofitInfo: nonprofitInfo,
            supporters: fundraiserRaisedDetails?.supporters ?? 0
          };
        }
      } catch (error) {
        console.error(`Failed to retrieve cached form for postId: ${postId}`, error);
      }

      return initialState;
    });

    // Destructure state for easier use
    const { fundraiserInfo, goalType, raised, goal, nonprofitInfo, supporters } = state;

    let coverImageUrl: string | null = null;
    let logoImageUrl: string | null = null;
    if (nonprofitInfo && fundraiserInfo) {
      const existingFundraiserDetails = await fetchExistingFundraiserDetails(
        nonprofitInfo.nonprofitID,
        fundraiserInfo.id,
        await getEveryPublicKey(context)
      );
      const coverImagePath = existingFundraiserDetails?.fundraiserInfo.coverImageCloudinaryId ?? null;
      const logoImagePath = existingFundraiserDetails?.nonprofitInfo.logoCloudinaryId ?? null;
      const imageManager = new ImageManager(context);
      if (coverImagePath !== null) {
        try {
          coverImageUrl = await imageManager.getImageUrl(coverImagePath, width);
          console.log(`cover image url: ${coverImageUrl}`);
        } catch (error) {
          context.ui.showToast("There was an error creating the post. Please try again later.");
          console.error(`Failed to retrieve cover image for postId: ${postId}`, error);

          // Attempt to delete the Reddit post to avoid orphaned posts
          try {
            await context.reddit.remove(postId, false);
          } catch (removePostError) {
            console.error('Failed to remove the Reddit post:', removePostError);
          }

          // Attempt to clean up by removing any potentially partially written data in Redis
          try {
            await removePostAndFormFromRedis(context.redis, postId);
          } catch (cleanupError) {
            console.error('Failed to clean up Redis data:', cleanupError);
          }
      }
    } else {
        coverImageUrl = null;
    }
      
    if (logoImagePath !== null) {
      try {
        logoImageUrl = await imageManager.getLogoUrl(logoImagePath);
        console.log(`logo image url: ${logoImageUrl}`);
      } catch (error) {
        context.ui.showToast("There was an error creating the post. Please try again later.");
        console.error(`Failed to retrieve logo image for postId: ${postId}`, error);

        // Attempt to delete the Reddit post to avoid orphaned posts
        try {
          await context.reddit.remove(postId, false);
        } catch (removePostError) {
          console.error('Failed to remove the Reddit post:', removePostError);
        }

        // Attempt to clean up by removing any potentially partially written data in Redis
        try {
          await removePostAndFormFromRedis(context.redis, postId);
        } catch (cleanupError) {
          console.error('Failed to clean up Redis data:', cleanupError);
        }
      }
    } else {
      logoImageUrl = null;
    }
  }

    const fundraiserUrl = generateFundraiserURL(fundraiserInfo, nonprofitInfo);

    // Subscribe to real-time updates for live changes to the raised amount
    const updateChannel = useChannel({
      name: 'fundraiser_updates',
      onMessage: (data: JSONValue) => {
        console.log("Received message on fundraiser_updates channel:", data);
        if (typeof data === 'object' && data !== null && 'postId' in data && data.postId === postId && 'updatedDetails' in data) {
          const updatedDetails = data.updatedDetails as Partial<EveryFundraiserRaisedDetails>;
          setState(prevState => ({
            ...prevState,
            raised: typeof updatedDetails.raised === 'number' ? updatedDetails.raised : prevState.raised,
            goal: typeof updatedDetails.goalAmount === 'number' ? updatedDetails.goalAmount : prevState.goal,
            supporters: typeof updatedDetails.supporters === 'number' ? updatedDetails.supporters : prevState.supporters,
            goalType: typeof updatedDetails.goalType === 'string' ? updatedDetails.goalType : prevState.goalType
          }));
        }
      }
    });
    updateChannel.subscribe();

    return (
      <blocks>
        {FundraiserView(fundraiserInfo, raised, goal, goalType, context, width, height, nonprofitInfo, coverImageUrl, logoImageUrl, fundraiserUrl, supporters)}
      </blocks>
    );
  }
};