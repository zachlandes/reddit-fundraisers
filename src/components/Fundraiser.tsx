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
import { FullScreenOverlay } from './FullScreenOverlay.js';

const DEBUG_MODE = false; // Toggle this value manually and re-upload to see changes

Devvit.configure({
  realtime: true,
});

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
  supporters: number,
  isButtonExpanded: boolean
): JSX.Element {
    const { ui, useState } = context;

    enum OverlayType {
      None,
      Description,
      NonprofitInfo
      // Add other overlay types as needed, e.g.:
      // SnoowyDayFund info,
      // Nonprofit info,
      // etc.
    }

    const [currentOverlay, setCurrentOverlay] = useState<OverlayType>(OverlayType.None);
    const fundraiserInfoHeight = Math.floor(totalHeight * 0.44); 
    const MOBILE_WIDTH = 393;
    const titleHeight = 26; 
    const lineHeight = 16;
    const lineWidth = MOBILE_WIDTH - 80;
    const imageHeight = 150;
    const overlayControlsHeight = 50;
    const paddingHeight = 16; // 8px top + 8px bottom for small padding
    const xsmallSpacerHeight = 4
    const coverImageHeight = Math.floor(totalHeight * 0.30);
    const bottomSectionHeight = totalHeight - fundraiserInfoHeight - coverImageHeight;
    const overlayDescriptionMaxHeight = totalHeight - overlayControlsHeight;

    const descriptionMaxHeight = fundraiserInfoHeight - titleHeight - 34;
    const availableDescriptionHeight = descriptionMaxHeight - paddingHeight - 2*xsmallSpacerHeight;
    const everyGreen = '#018669';
    const borderGray = '#C0C0C0'; //'#A0A0A0'; 
    
    const fontSize = 12;
    const fontFamily = "helvetica";
    const sampleText = fundraiserInfo?.description.slice(0, 100) || 'Sample Text';
    const charWidth = pixelWidth(sampleText, { font: fontFamily, size: fontSize } ) / sampleText.length;
    
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

    const handleExpandOverlay = (overlayType: OverlayType) => {
        console.log(`Expanding overlay: ${OverlayType[overlayType]}`);
        setCurrentOverlay(overlayType);
    };

    const handleCloseOverlay = () => {
        console.log("Closing overlay");
        setCurrentOverlay(OverlayType.None);
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

    function renderOverlay() {
        switch (currentOverlay) {
            case OverlayType.Description:
                return (
                    <FullScreenOverlay onClose={handleCloseOverlay} maxWidth={MOBILE_WIDTH}>
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
                    </FullScreenOverlay>
                );
              case OverlayType.NonprofitInfo:
                return (
                    <FullScreenOverlay onClose={handleCloseOverlay} maxWidth={MOBILE_WIDTH}>
                        <vstack grow>
                            <text size='small' wrap={true} color='neutral-content'>
                                {nonprofitInfo?.description} 
                            </text>
                        </vstack>
                    </FullScreenOverlay>
                );
            // Add cases for other overlay types as needed
            default:
                return null;
        }
    }

    return (
      <zstack width="100%" height={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'} alignment='center' grow>
        <vstack maxWidth={`${MOBILE_WIDTH}px`} height={100} width={100} borderColor={borderGray} border='thin'>
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
                onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}
              />
              <spacer size='xsmall' />
              <text weight='bold' onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}>
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
                  <text size='small' weight='bold' color={everyGreen} onPress={() => handleExpandOverlay(OverlayType.Description)}>Read more</text>
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
                    icon="external"
                    iconPosition="right"
                    isExpanded={isButtonExpanded}
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
        {renderOverlay()}
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

    const { postId, useChannel, useState, useInterval } = context;

    if (typeof postId !== 'string') {
      throw new Error('postId is undefined');
    }

    // State for static data
    const [staticData, setStaticData] = useState<{
      fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
      nonprofitInfo: EveryNonprofitInfo | null,
      coverImageUrl: string | null,
      logoImageUrl: string | null
    }>({
      fundraiserInfo: null,
      nonprofitInfo: null,
      coverImageUrl: null,
      logoImageUrl: null
    });

    // State for dynamic data
    const [dynamicData, setDynamicData] = useState<{
      goalType: string,
      raised: number,
      goal: number | null,
      supporters: number
    }>({
      goalType: '',
      raised: 0,
      goal: null,
      supporters: 0
    });

    // Fetch static data from Redis
    if (!staticData.fundraiserInfo) {
      try {
        const cachedForm = await getCachedForm(context, postId);
        if (cachedForm) {
          const fundraiserInfo = cachedForm.getAllProps(TypeKeys.everyExistingFundraiserInfo);
          const nonprofitInfo = cachedForm.getAllProps(TypeKeys.everyNonprofitInfo);
          const fundraiserDetails = cachedForm.getAllProps(TypeKeys.fundraiserDetails);

          setStaticData({
            fundraiserInfo: fundraiserInfo ? serializeExistingFundraiserResponse(fundraiserInfo) : null,
            nonprofitInfo: nonprofitInfo,
            coverImageUrl: fundraiserInfo?.coverImageCloudinaryId || null,
            logoImageUrl: nonprofitInfo?.logoCloudinaryId || null
          });

          setDynamicData({
            goalType: fundraiserDetails?.goalType || '',
            raised: fundraiserDetails?.raised || 0,
            goal: fundraiserDetails?.goalAmount || null,
            supporters: fundraiserDetails?.supporters || 0
          });
        }
      } catch (error) {
        console.error(`Failed to retrieve data from Redis for postId: ${postId}`, error);
      }
    }

    // Create and subscribe to the fundraiser_updates channel
    const updateChannel = useChannel({
      name: 'fundraiser_updates',
      onMessage: (data: JSONValue) => {
        console.log("Received message on fundraiser_updates channel:", data);
        if (typeof data === 'object' && data !== null && 'postId' in data && data.postId === postId) {
          if ('updatedDetails' in data) {
            const updatedDetails = data.updatedDetails as Partial<EveryFundraiserRaisedDetails>;
            setDynamicData(prevState => ({
              ...prevState,
              raised: typeof updatedDetails.raised === 'number' ? updatedDetails.raised : prevState.raised,
              goal: typeof updatedDetails.goalAmount === 'number' ? updatedDetails.goalAmount : prevState.goal,
              supporters: typeof updatedDetails.supporters === 'number' ? updatedDetails.supporters : prevState.supporters,
              goalType: typeof updatedDetails.goalType === 'string' ? updatedDetails.goalType : prevState.goalType
            }));
          }
        }
      },
      onSubscribed: () => {
        console.log("Successfully subscribed to fundraiser_updates channel");
      }
    });

    try {
      await updateChannel.subscribe();
    } catch (error) {
      console.error("Error subscribing to channels:", error);
    }

    const [isButtonExpanded, setIsButtonExpanded] = useState(false);

    const fundraiserUrl = generateFundraiserURL(staticData.fundraiserInfo, staticData.nonprofitInfo);

    // tick animation
    // useInterval(() => {
    //   setIsButtonExpanded(prev => !prev);
    // }, 1000).start();

    return (
      <blocks>
        {FundraiserView(
          staticData.fundraiserInfo,
          dynamicData.raised,
          dynamicData.goal,
          dynamicData.goalType,
          context,
          width,
          height,
          staticData.nonprofitInfo,
          staticData.coverImageUrl,
          staticData.logoImageUrl,
          fundraiserUrl,
          dynamicData.supporters,
          isButtonExpanded
        )}
      </blocks>
    );
  }
};
