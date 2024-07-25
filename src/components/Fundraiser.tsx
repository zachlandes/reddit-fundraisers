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
import { calculateLayout, ViewportType, VIEWPORT_CONFIGS } from '../utils/constants.js';

const DEBUG_MODE = false; // Toggle this value manually and re-upload to see changes

Devvit.configure({
  realtime: true,
  redditAPI: true
});

interface FundraiserState extends JSONObject {
  fundraiserInfo: SerializedEveryExistingFundraiserInfo | null;
  goalType: string;
  raised: number;
  goal: number | null;
  nonprofitInfo: EveryNonprofitInfo | null;
  supporters: number;
}

function generateFundraiserURL(
    fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
    nonprofitInfo: EveryNonprofitInfo | null,
    subreddit: string | undefined
): string {
  if (!fundraiserInfo) return ''; // TODO: better default?
  const utm_content = fundraiserInfo.id ? `&utm_content=${fundraiserInfo.id}` : '';
  const utm_campaign = subreddit ? `&utm_campaign=${subreddit}`: '';
  const utm = `?utm_source=reddit&utm_medium=fundraisers${utm_content}${utm_campaign}`;
  return `https://every.org/${nonprofitInfo?.primarySlug}/f/${fundraiserInfo.slug}#/donate${utm}`;
}


export function FundraiserView(
  fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
  raised: number,
  goal: number | null,
  goalType: string | null,
  context: Context,
  width: number,
  totalHeight: number,
  nonprofitInfo: EveryNonprofitInfo | null,
  coverImageUrl: string | null,
  logoImageUrl: string | null,
  fundraiserURL: string,
  supporters: number,
  isButtonExpanded: boolean,
  paginatedDescription: string[],
  showExpandButton: boolean,
  displayDescription: string,
  config: typeof VIEWPORT_CONFIGS[ViewportType]
): JSX.Element {
    const { ui, useState, dimensions } = context;

    enum OverlayType {
      None,
      Description,
      NonprofitInfo,
      FundraisersApp
    }

    const [currentOverlay, setCurrentOverlay] = useState<OverlayType>(OverlayType.None);
    const fundraiserInfoHeight = Math.floor(totalHeight * config.FUNDRAISER_INFO_HEIGHT_RATIO);
    const MOBILE_WIDTH = config.MOBILE_WIDTH;
    const titleHeight = config.TITLE_HEIGHT;
    const lineHeight = config.LINE_HEIGHT;
    const lineWidth = MOBILE_WIDTH - 80;
    const imageHeight = 150;
    const overlayControlsHeight = 50;
    const paddingHeight = config.PADDING_HEIGHT;
    const xsmallSpacerHeight = config.XSMALL_SPACER_HEIGHT;
    const coverImageHeight = Math.floor(totalHeight * 0.30);
    const bottomSectionHeight = totalHeight - fundraiserInfoHeight - coverImageHeight;
    const overlayDescriptionMaxHeight = totalHeight - overlayControlsHeight;

    const descriptionMaxHeight = fundraiserInfoHeight - titleHeight - 3*lineHeight;
    const availableDescriptionHeight = descriptionMaxHeight - paddingHeight - 2*xsmallSpacerHeight;
    const everyGreen = '#018669';
    const borderGray = '#C0C0C0'; //'#A0A0A0';

    const fontSize = config.FONT_SIZE;
    const fontFamily = config.FONT_FAMILY;
    const sampleText = fundraiserInfo?.description.slice(0, 100) || 'Sample Text';
    const charWidth = pixelWidth(sampleText, { font: fontFamily, size: fontSize } ) / sampleText.length;

    const descriptionPages = fundraiserInfo
        ? paginateText(fundraiserInfo.description, overlayDescriptionMaxHeight, lineHeight, lineWidth, charWidth)
        : ['Loading description...'];

    const { currentPage, currentItems, toNextPage, toPrevPage, pagesCount } = usePagination(context, descriptionPages, 1);

    const magicWidthPercentageProgressBar = 97;

    const handleExpandOverlay = (overlayType: OverlayType) => {
        console.log(`Expanding overlay: ${OverlayType[overlayType]}`);
        setCurrentOverlay(overlayType);
    };

    const handleCloseOverlay = () => {
        console.log("Closing overlay");
        setCurrentOverlay(OverlayType.None);
    };

    const handleExpandDescription = () => {
      if (showExpandButton) {
        handleExpandOverlay(OverlayType.Description);
      }
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

    function renderProgress() {
      if((goal ?? 0) <= 0){
        // No Goal on this fundraiser
        return (
          <vstack width={100} borderColor={DEBUG_MODE ? 're' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <hstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <hstack
                width={100}
                borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'}
                border={DEBUG_MODE ? 'thin' : 'none'}
                backgroundColor={everyGreen}
                alignment='center middle'
                padding='medium'
              >
                <text weight='bold' color='#FFFFFF' size='large'>${new Intl.NumberFormat('en-US').format(Math.round(raised / 100))} Raised</text>
              </hstack>
            </hstack>
          </vstack>
        );
      }
      else {
        // Fundraiser has a goal
        return (
          <vstack width={100} minWidth={100} maxWidth={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <hstack width={100} minWidth={100} maxWidth={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <hstack width={100} alignment='start middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <spacer grow />
                <vstack width={48} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <text weight='bold' color='neutral-content-strong' overflow='ellipsis'>${new Intl.NumberFormat('en-US').format(Math.round(raised / 100))}</text>
                  <text color='#706E6E'>Raised</text>
                </vstack>
                <vstack width={48} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <text alignment='end' weight='bold' color='neutral-content-strong' overflow='ellipsis'>${goal ? new Intl.NumberFormat('en-US').format(goal / 100) : new Intl.NumberFormat('en-US').format(raised / 100)}</text>
                  {goal && goalType && (
                    <text alignment='end' color='#706E6E'>
                      {goalType === 'AUTOMATIC' ? 'Next milestone' : 'Goal'}
                    </text>
                  )}
                </vstack>
                <spacer grow />
              </hstack>
            </hstack>
            <hstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <spacer grow />
              {renderProgressBar()}
              <spacer grow />
            </hstack>
          </vstack>
        );
      }
    }

    function renderOverlay() {
        switch (currentOverlay) {
            case OverlayType.Description:
                return (
                    <FullScreenOverlay onClose={handleCloseOverlay} maxWidth={MOBILE_WIDTH}>
                        <vstack grow borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                            <text size='small' wrap={true} color='neutral-content-strong'>
                                {currentItems[0]}
                            </text>
                        </vstack>
                        <hstack alignment="center middle" gap="small" width={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                            <button onPress={toPrevPage} icon="left" disabled={currentPage === 0} size="small" />
                            <text color='neutral-content-strong'>{currentPage + 1} / {pagesCount}</text>
                            <button onPress={toNextPage} icon="right" disabled={currentPage === pagesCount - 1} size="small" />
                        </hstack>
                    </FullScreenOverlay>
                );
              case OverlayType.NonprofitInfo:
                return (
                    <FullScreenOverlay onClose={handleCloseOverlay} maxWidth={MOBILE_WIDTH}>
                        <vstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                          <hstack alignment='middle' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'} padding="xsmall">
                            <spacer size='xsmall' />
                            {logoImageUrl && (
                              <>
                                <CircularLogo
                                  url={logoImageUrl}
                                  size={35}
                                  description="Nonprofit Logo"
                                  onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}
                                />
                                <spacer size='xsmall' />
                              </>
                            )}
                            <text weight='bold' color='neutral-content-strong' onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}>
                              {nonprofitInfo?.name}
                            </text>
                          </hstack>
                          <hstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                            <spacer size='small' />
                            <text size="small" color="neutral-content-weak" alignment="start">
                                EIN: {nonprofitInfo?.ein ?? 'Not available'}
                            </text>
                          </hstack>
                          <spacer size='small' />
                        </vstack>
                        <vstack width={100} grow minWidth={100} maxWidth={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                          <hstack width={100} grow minWidth={100} maxWidth={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                            <spacer size='xsmall' />
                            <text width={100} minWidth={100} maxWidth={100} size='small' wrap={true} color='neutral-content-strong'>
                                {nonprofitInfo?.description}
                            </text>
                          </hstack>
                        </vstack>
                    </FullScreenOverlay>
                );
            case OverlayType.FundraisersApp:
                return (
                    <FullScreenOverlay onClose={handleCloseOverlay} maxWidth={MOBILE_WIDTH}>
                        <vstack borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                          <vstack gap="small" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                            <text size="large" weight="bold" wrap={true} color='neutral-content-strong'>Fundraisers: Easy Donations on Reddit</text>
                            <text size="medium" weight="bold" color='neutral-content-strong'>What is it?</text>
                            <text wrap={true} size="small" color='neutral-content-strong'>Fundraisers on Reddit lets you donate to nonprofits directly through Reddit posts. A quick and secure way to support causes you care about.</text>
                            <text size="medium" weight="bold" color='neutral-content-strong'>How to Donate:</text>
                            <vstack gap="small" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                                <text wrap={true} size="small" color='neutral-content-strong'>1. Click Donate: Hit the "Donate" button in this post.</text>
                                <text wrap={true} size="small" color='neutral-content-strong'>2. Choose Payment Method: Select from popular payment processors like PayPal, Apple Pay, or Venmo.</text>
                                <text wrap={true} size="small" color='neutral-content-strong'>3. Complete Donation: Your donation is disbursed via Every.org, minus any processing fees. You'll get an email receipt for tax purposes.</text>
                            </vstack>
                            <hstack alignment="start middle" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                                <text size="small" color='neutral-content-strong'>
                                    For more information, visit the
                                </text>
                                <text selectable={false}>&nbsp;</text>
                                <vstack onPress={() => context.ui.navigateTo('https://developers.reddit.com/apps/fundraisers-app')} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                                    <text size="small" color="blue" selectable={false}>
                                        Fundraisers
                                    </text>
                                    <hstack height={'1px'} backgroundColor="blue" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}></hstack>
                                </vstack>
                                <text selectable={false}>&nbsp;</text>
                                <text size="small" color='neutral-content-strong'>
                                    page
                                </text>
                            </hstack>
                          </vstack>
                            <text size="small" color='neutral-content-strong'> on the reddit app directory</text>
                            <spacer size="small" />
                            <text wrap={true} size="small" weight="bold" color='neutral-content-strong'>Support your community's charitable goals easily and securely with Fundraisers on Reddit!</text>
                            <spacer size="xsmall" />
                            <text size="xsmall" color='neutral-content-strong' wrap={true}>Every.org is not sponsored by, endorsed by, or associated with Reddit or the Fundraisers App.</text>
                        </vstack>
                    </FullScreenOverlay>
                );
            default:
                return null;
        }
    }

    function renderDescription() {
      const isSmallViewport = dimensions ? dimensions.width < 640 : true;
      const descriptionContent = (
        <text
          size='small'
          wrap={true}
          maxHeight={`${availableDescriptionHeight}px`}
          color='neutral-content-strong'
        >
          {displayDescription}
        </text>
      );
    
      return (
        <vstack width={100} maxHeight={`${descriptionMaxHeight}px`} grow padding="small" borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
          {isSmallViewport && showExpandButton ? (
            <vstack onPress={handleExpandDescription}>
              {descriptionContent}
              <spacer size='xsmall' />
              <text size='medium' weight='bold' color={everyGreen}>
                Read more
              </text>
            </vstack>
          ) : (
            <>
              {descriptionContent}
              {showExpandButton && (
                <>
                  <spacer size='xsmall' />
                  <text size='medium' weight='bold' color={everyGreen} onPress={() => handleExpandOverlay(OverlayType.Description)}>
                    Read more
                  </text>
                </>
              )}
            </>
          )}
        </vstack>
      );
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
              {logoImageUrl && (
                <>
                  <CircularLogo
                    url={logoImageUrl}
                    size={35}
                    description="Nonprofit Logo"
                    onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}
                  />
                  <spacer size='xsmall' />
                </>
              )}
              <text maxWidth={`${MOBILE_WIDTH-43}px`} weight='bold' color='neutral-content-strong' onPress={() => handleExpandOverlay(OverlayType.NonprofitInfo)}>
                {nonprofitInfo?.name}
              </text>
              <spacer size='medium' />
            </hstack>
            <vstack width={100} maxHeight={`${fundraiserInfoHeight}px`} grow borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <spacer size='xsmall' />
              <hstack width={100} maxWidth={`${MOBILE_WIDTH}px`} maxHeight={`${titleHeight}px`} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <spacer size='small' />
                <text maxWidth={`${MOBILE_WIDTH-8}px`} size="large" weight='bold' color='neutral-content-strong' overflow='ellipsis'>
                  {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
                </text>
                <spacer grow />
              </hstack>
              {renderDescription()}
            </vstack>
          </vstack>
          <vstack width={100} grow borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
            <spacer size='xsmall' />
            {renderProgress()}
            <vstack width={100} borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
              <spacer grow />
              <hstack width='100%' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                <hstack width='33%' alignment='start top' borderColor={DEBUG_MODE ? 'red' : 'neutral-border-weak'} border={DEBUG_MODE ? 'thin' : 'none'}>
                  <spacer size='small' />
                  <vstack alignment='start top'>
                    <text size='small' wrap={true} weight='bold' color='neutral-content-strong'>
                      {supporters === 0 ? "" : `${new Intl.NumberFormat('en-US').format(supporters)} Supporters`}
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
            <Watermark onInfoClick={() => handleExpandOverlay(OverlayType.FundraisersApp)} />
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
  render: context => {
    const { height, width } = context.dimensions ?? { height: 480, width: 320 };
    console.log("Starting render of FundraiserPost with dimensions:", { height, width });
    const {
      viewportType,
      config: viewportConfig,
      fundraiserInfoHeight,
      lineWidth,
      descriptionMaxHeight,
      availableDescriptionHeight,
    } = calculateLayout(height, width);

    const { postId, useState } = context;

    if (typeof postId !== 'string') {
      throw new Error('postId is undefined');
    }

    // Add loading state
    const [isLoading, setIsLoading] = useState(true);

    const [subreddit, setSubreddit] = useState<string | null>(async () => {
      try {
        const sub = await context.reddit.getSubredditById(context.subredditId);
        return sub.name;
      } catch (error) {
        console.error("Error fetching subreddit:", error);
        return null;
      }
    });

    // Function to update paginated description
    const updatePaginatedDescription = (description: string) => {
      const sampleText = description.slice(0, 100) || 'Sample Text';
      const charWidth = pixelWidth(sampleText, { font: viewportConfig.FONT_FAMILY, size: viewportConfig.FONT_SIZE }) / sampleText.length;

      const smallPaginatedDescription = paginateText(description, availableDescriptionHeight, viewportConfig.LINE_HEIGHT, lineWidth, charWidth);
      const showExpandButton = smallPaginatedDescription.length > 1;
      const displayDescription = showExpandButton
        ? smallPaginatedDescription[0].replace(/\s+$/, '') + '...'
        : smallPaginatedDescription[0];

      return {
        description,
        paginatedDescription: smallPaginatedDescription,
        showExpandButton,
        displayDescription
      };
    };

    // State for static data
    const [staticData, setStaticData] = useState<{
      fundraiserInfo: SerializedEveryExistingFundraiserInfo | null;
      nonprofitInfo: EveryNonprofitInfo | null;
      logoImageUrl: string | null;
      subreddit: string | null;
      goalType: string | null;
    }>(async () => {
      const initialData = {
        fundraiserInfo: null,
        nonprofitInfo: null,
        logoImageUrl: null,
        subreddit: null,
        goalType: null
      };

      try {
        const cachedForm = await getCachedForm(context, postId);
        if (cachedForm) {
          const fundraiserInfo = cachedForm.getAllProps(TypeKeys.everyExistingFundraiserInfo);
          const nonprofitInfo = cachedForm.getAllProps(TypeKeys.everyNonprofitInfo);
          const fundraiserDetails = cachedForm.getAllProps(TypeKeys.fundraiserDetails);

          const updatedData = {
            fundraiserInfo: fundraiserInfo ? serializeExistingFundraiserResponse(fundraiserInfo) : null,
            nonprofitInfo: nonprofitInfo,
            logoImageUrl: nonprofitInfo?.logoCloudinaryId || null,
            subreddit: subreddit,
            goalType: fundraiserDetails?.goalType || null
          };

          return updatedData;
        }
      } catch (error) {
        console.error(`Failed to retrieve data from Redis for postId: ${postId}`, error);
      } finally {
        setIsLoading(false); // Set loading to false after data fetch attempt
      }

      setIsLoading(false); // Ensure loading is set to false even if there's no cached data
      return initialData;
    });

    // State for dynamic data
    const [dynamicData, setDynamicData] = useState<{
      raised: number;
      goal: number | null;
      supporters: number;
      description: string;
      paginatedDescription: string[];
      showExpandButton: boolean;
      displayDescription: string;
      coverImageUrl: string | null;
    }>(async () => {
      const initialData = {
        raised: 0,
        goal: null,
        supporters: 0,
        description: '',
        paginatedDescription: [],
        showExpandButton: false,
        displayDescription: '',
        coverImageUrl: null
      };

      try {
        const cachedForm = await getCachedForm(context, postId);
        if (cachedForm) {
          const fundraiserDetails = cachedForm.getAllProps(TypeKeys.fundraiserDetails);
          const fundraiserInfo = cachedForm.getAllProps(TypeKeys.everyExistingFundraiserInfo);
          
          const updatedData = {
            raised: fundraiserDetails?.raised || 0,
            goal: fundraiserDetails?.goalAmount || null,
            supporters: fundraiserDetails?.supporters || 0,
            ...updatePaginatedDescription(fundraiserInfo?.description || ''),
            coverImageUrl: fundraiserInfo?.coverImageCloudinaryId || null
          };

          return updatedData;
        }
      } catch (error) {
        console.error(`Failed to retrieve dynamic data from Redis for postId: ${postId}`, error);
      } finally {
        setIsLoading(false); // Ensure loading is set to false after dynamic data fetch
      }

      return initialData;
    });

    // Create the channel
    const updateChannel = context.useChannel({
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
              supporters: typeof updatedDetails.supporters === 'number' ? updatedDetails.supporters : prevState.supporters
            }));
          }
          if ('updatedDescription' in data) {
            const updatedDescription = data.updatedDescription as { description: string };
            setDynamicData(prevState => ({
              ...prevState,
              ...updatePaginatedDescription(updatedDescription.description)
            }));
          }
          if ('updatedCoverImage' in data) {
            const updatedCoverImage = data.updatedCoverImage as { coverImageUrl: string };
            setDynamicData(prevState => ({
              ...prevState,
              coverImageUrl: updatedCoverImage.coverImageUrl
            }));
          }
        }
      },
    });

    // Handle subscription in a useState
    const [isSubscribed, setIsSubscribed] = useState(async () => {
      try {
        await updateChannel.subscribe();
        console.log("Successfully subscribed to fundraiser_updates channel");
        return true;
      } catch (error) {
        console.error("Error subscribing to channel:", error);
        return false;
      }
    });

    const [isButtonExpanded, setIsButtonExpanded] = useState(false);

    const fundraiserUrl = generateFundraiserURL(
      staticData.fundraiserInfo,
      staticData.nonprofitInfo,
      staticData.subreddit || undefined
    );

    // Log cover image URL for debugging
    console.log("Cover Image URL:", dynamicData.coverImageUrl);

    // Render loading state if data is still being fetched
    if (isLoading) {
      return (
        <blocks>
          <vstack alignment="center middle" height={height} width={width}>
            <text>Loading fundraiser data...</text>
          </vstack>
        </blocks>
      );
    }

    // Render the main component once data is loaded
    return (
      <blocks>
        {FundraiserView(
          staticData.fundraiserInfo,
          dynamicData.raised,
          dynamicData.goal,
          staticData.goalType,
          context,
          width,
          height,
          staticData.nonprofitInfo,
          dynamicData.coverImageUrl,
          staticData.logoImageUrl,
          fundraiserUrl,
          dynamicData.supporters,
          isButtonExpanded,
          dynamicData.paginatedDescription,
          dynamicData.showExpandButton,
          dynamicData.displayDescription,
          viewportConfig
        )}
      </blocks>
    );
  }
};
