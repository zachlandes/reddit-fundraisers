import { Context, CustomPostType, Devvit, JSONValue, JSONObject } from '@devvit/public-api';
import { EveryFundraiserRaisedDetails, EveryNonprofitInfo, SerializedEveryExistingFundraiserInfo } from '../types/index.js';
import { getCachedForm } from '../utils/Redis.js';
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
    const { ui } = context;
    const descriptionHeightPct = 26;
    const descriptionMaxHeight = totalHeight*(descriptionHeightPct/100);
    const lineHeight = 17;
    const lineWidth = 393 * 0.95;
    const imageHeight = 150;

    // Calculate charWidth based on the actual description text
    const fontSize = 12; // Adjust this value based on your text size
    const fontFamily = "helvetica";
    const sampleText = fundraiserInfo?.description.slice(0, 100) || 'Sample Text';
    const charWidth = pixelWidth(sampleText, { font: fontFamily, size: fontSize } ) / sampleText.length;
    console.log("charWidth: ", charWidth);

    const descriptionPages = fundraiserInfo
        ? paginateText(fundraiserInfo.description, descriptionMaxHeight, lineHeight, lineWidth, charWidth)
        : ['Loading description...'];

    const { currentPage, currentItems, toNextPage, toPrevPage, pagesCount } = usePagination(context, descriptionPages, 1);

    const magicWidthPercentageProgressBar = 97;

    return (
        <vstack width="100%" height={100} borderColor='red' border='thin' alignment='center' grow>
          <vstack maxWidth={'393px'} height={100} width={100} borderColor='red' border='thin'>
            <vstack width="100%" height={30} alignment='center middle' borderColor='red' border='thin'>
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
            <vstack width="100%" borderColor='red' height={46} border='thin'>
              <hstack alignment='middle' borderColor='red' border='thin' padding="xsmall">
                {/* LOGO, NONPROFIT NAME */}
                <spacer size='small' />
                <CircularLogo
                  url={logoImageUrl ? logoImageUrl : 'loading_logo.png'}
                  size={35}
                  description="Nonprofit Logo"
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
              <hstack borderColor='red' border='thin' width={100}>
                {/* FUNDRAISER TITLE */}
                <text size="large">
                  {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
                </text>
              </hstack>
              {/* PAGINATED FUNDRAISER DESC */}
              <vstack width={100} grow padding="xsmall" borderColor='green' border='thin'>
                <text size='small' wrap={true} overflow='ellipsis'>
                  {currentItems[0]}
                </text>
              </vstack>
                  {/* PAGINATION UI */}
              <hstack alignment="center middle" gap="small" width={100} borderColor='red' border='thin'>
                  <button onPress={toPrevPage} icon="left" disabled={currentPage === 0} size="small"/>
                  <text>{currentPage + 1} / {pagesCount}</text>
                  <button onPress={toNextPage} icon="right" disabled={currentPage === pagesCount - 1} size="small"/>
              </hstack>
            </vstack>
            <vstack width={100} height={24} borderColor='red' border='thin'>
              <vstack width={100} borderColor='red' border='thin'>
                <hstack borderColor='red' border='thin'>
                  {/* PROGRESS BAR LABELS */}
                  <spacer grow />
                  <hstack width={`${magicWidthPercentageProgressBar/2}%`} alignment='start' borderColor='red' border='thin'>
                      <vstack borderColor='red' border='thin'>
                          <text weight='bold'>${new Intl.NumberFormat('en-US').format(raised / 100)}</text>  {/* comes in as cents, formatted with commas */}
                          <text color='#706E6E'>Raised</text>
                      </vstack>
                  </hstack>
                  <hstack width={`${magicWidthPercentageProgressBar/2}%`} alignment='end' borderColor='red' border='thin'>
                    <spacer size='medium' />
                    <vstack alignment='end' borderColor='red' border='thin'>
                        <text weight='bold'>${goal ? new Intl.NumberFormat('en-US').format(goal / 100) : new Intl.NumberFormat('en-US').format(raised / 100)}</text> {/* comes in as cents, formatted with commas */}
                        {goalType && (
                          <text color='#706E6E'>
                            {goalType === 'AUTOMATIC' ? 'Next milestone' : 'Goal'}
                          </text>
                        )}
                    </vstack>
                  </hstack>
                  <spacer grow />
                </hstack>
                <hstack borderColor='red' border='thin'>
                  <spacer grow />
                  <vstack backgroundColor='#f3f7f7' cornerRadius='full' width={`${magicWidthPercentageProgressBar}%`} borderColor='red' border='thin'>
                    {/* PROGRESS BAR */}
                    <hstack backgroundColor='#018669' width={`${goal ? (raised / goal) * 100 : 0}%`} borderColor='red' border='thin'>
                      <spacer size='medium' shape='square' />
                    </hstack>
                  </vstack>
                  <spacer grow />
                </hstack>
              </vstack>
              <vstack width={100} borderColor='red' border='thin'>
                <hstack width='100%' alignment='center middle' borderColor='red' border='thin'>
                  <hstack width='33%' alignment='start middle' borderColor='red' border='thin'>
                    <spacer grow />
                  </hstack>
                  <hstack width='34%' alignment='center middle' borderColor='red' border='thin'>
                    {/* DONATE BUTTON */}
                    <FancyButton
                      backgroundColor="#018669"
                      textColor="white"
                      height={40}
                      onPress={() => {
                        if (fundraiserInfo) {
                          context.ui.navigateTo(fundraiserURL);
                        }
                      }}
                    >
                      Donate
                    </FancyButton>
                  </hstack>
                  <hstack width='33%' alignment='end middle' borderColor='red' border='thin'>
                    <text size='small' color='#706E6E'>
                      {supporters === 0 ? "Be the first to donate!" : `${supporters} Supporters`}
                    </text>
                  </hstack>
                </hstack>
              </vstack>
            </vstack>
          </vstack>
        </vstack>
    )
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
        console.log("Cached data retrieved:", cachedData);
        if (cachedData) {
          const fundraiserRaisedDetails = cachedData.getAllProps(TypeKeys.fundraiserDetails);
          const everyExistingFundraiserInfo = cachedData.getAllProps(TypeKeys.everyExistingFundraiserInfo);
          const nonprofitInfo = cachedData.getAllProps(TypeKeys.everyNonprofitInfo);
          
          console.log("Parsed cached data:", {
            fundraiserRaisedDetails,
            everyExistingFundraiserInfo,
            nonprofitInfo
          });

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

    console.log("Current state:", state);
    console.log("Rendering FundraiserView with:", { fundraiserInfo, raised, goal, goalType, nonprofitInfo, supporters });

    return (
      <blocks>
        {FundraiserView(fundraiserInfo, raised, goal, goalType, context, width, height, nonprofitInfo, coverImageUrl, logoImageUrl, fundraiserUrl, supporters)}
      </blocks>
    );
  }
};