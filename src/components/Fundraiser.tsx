import { Context, CustomPostType, Devvit} from '@devvit/public-api';
import { EveryNonprofitInfo, SerializedEveryExistingFundraiserInfo } from '../types/index.js';
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
import { CurvedTopImage } from './CurvedTopImage.js';

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
            <spacer grow />
            <vstack width="100%" borderColor='blue' height={46} border='thin'>
              <hstack alignment='middle' borderColor='red' border='thin'>
                {/* LOGO, NONPROFIT NAME */}
                <spacer size='medium' />
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
                <spacer grow />
                <vstack width='95%' alignment='start middle' borderColor='red' border='thin'>
                    <text size="large">
                      {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
                    </text>
                </vstack>
                <spacer grow />
              </hstack>
              {/* PAGINATED FUNDRAISER DESC */}
              <vstack width={100} grow padding="xsmall" borderColor='green' border='thin'>
                <text size='small' wrap={true} overflow='ellipsis'>
                  {currentItems[0]}
                </text>
              </vstack>
              <hstack alignment="start middle" gap="small" width={100} borderColor='red' border='thin'>
                <spacer grow />
                <hstack borderColor='red' width = {`${magicWidthPercentageProgressBar}%`} border='thin' alignment="center middle">
                  {/* PAGINATION UI */}
                  <button onPress={toPrevPage} icon="left" disabled={currentPage === 0} size="small"/>
                  <text>{currentPage + 1} / {pagesCount}</text>
                  <button onPress={toNextPage} icon="right" disabled={currentPage === pagesCount - 1} size="small"/>
                </hstack>
                <spacer grow />
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
                      {supporters} Supporters{supporters === 0 ? " - Be the first!" : ""}
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
    const [supporters, setSupporters] = useState<number>(fundraiserRaisedDetails ? fundraiserRaisedDetails.supporters : 0);

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
          if (data.updatedDetails.supporters !== undefined && data.updatedDetails.supporters !== fundraiserRaisedDetails?.supporters) {
            console.log('Received update for supporters count:', data.updatedDetails.supporters);
            setSupporters(data.updatedDetails.supporters);
          }
        }
      }
    });
    updateChannel.subscribe();

    return (
      <blocks>
        {FundraiserView(fundraiserInfo, raised, goal, goalType, context, width, height, nonprofitInfo, coverImageUrlState, logoImageUrlState, fundraiserURL, supporters)}
      </blocks>
    );
  }
}