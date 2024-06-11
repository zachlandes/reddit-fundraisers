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
import { uploadImageToRedditCDN } from '../utils/ImageHandlers.js';

function generateFundraiserURL(fundraiserInfo: SerializedEveryExistingFundraiserInfo | null): string {
  if (!fundraiserInfo) return ''; // TODO: better default?
  return `https://every.org//f/${fundraiserInfo.slug || fundraiserInfo.id}`;
}

export function FundraiserView(
  fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
  raised: number,
  context: Context,
  width: number,
  totalHeight: number,
  nonprofitInfo: EveryNonprofitInfo | null,
  charWidth: number,
  coverImageUrl: string | null,
  fundraiserURL: string
): JSX.Element {
    const { useState } = context;
    const descriptionMaxHeight = totalHeight - 398; 
    const lineHeight = 16;
    const lineWidth = width + 60; 
    const imageHeight = 150; // Height of the cover image
    const logoHeight = 30; // Height of the logo image
    //FIXME: we should think carefully about how we obtain these values, e.g. what should be dynamic, what should be based on the (potentially cached) image dimensions, etc.
    //FIXME: next milestone text needs adjusting to fit appropriate scenario (e.g. fixed, single goal)
    const descriptionPages = fundraiserInfo
        ? paginateText(fundraiserInfo.description, descriptionMaxHeight, lineHeight, lineWidth, charWidth, imageHeight, logoHeight)
        : ['Loading description...'];

    const { currentPage, currentItems, toNextPage, toPrevPage } = usePagination(context, descriptionPages, 1);

    return (
        <vstack width={`${width}px`} gap='small'>
            {currentPage === 0 && (
                <vstack width="100%" alignment='center middle'>
                    <image 
                        url={coverImageUrl ? coverImageUrl : 'placeholder-image-url'}
                        width="100%"
                        imageWidth={`${width}px`}
                        imageHeight={`${imageHeight}px`}
                        description="Fundraiser Image"
                    />
                    <image 
                        url={nonprofitInfo?.logoUrl ? nonprofitInfo.logoUrl : 'placeholder-logo-url'}
                        width="100%"
                        imageWidth={`${width}px`}
                        imageHeight={`${logoHeight}px`}
                        description="Nonprofit Logo"
                    />
                </vstack>
            )}
            <vstack width='100%' padding="medium" alignment='start middle'>
              <text size="xlarge">
                {fundraiserInfo ? fundraiserInfo.title : 'A fundraiser!'}
              </text>
              <vstack width='100%' minHeight={`${descriptionMaxHeight}px`}>
                {currentItems.map((page, index) => (
                    <text key={index.toString()} size='small' wrap overflow="ellipsis">
                        {page}
                    </text>
                ))}
              </vstack>
              <hstack alignment="middle center" gap="small">
                <button onPress={toPrevPage} icon="left" />
                <text>{currentPage + 1}</text>
                <button onPress={toNextPage} icon="right" />
              </hstack>
              <spacer size='small' /> 
              <hstack width='100%'>
                <hstack width='50%' alignment='start'>
                    <vstack>
                        <text weight='bold'>${raised}</text>
                        <text color='#706E6E'>Raised</text>
                    </vstack>
                </hstack>
                <hstack width='50%' alignment='end'>
                    <vstack alignment='end'>
                        <text weight='bold'>${fundraiserInfo ? fundraiserInfo.goalAmount : '0'}</text>
                        <text color='#706E6E'>Next milestone</text>
                    </vstack>
                </hstack>
              </hstack>
              <vstack backgroundColor='#f3f7f7' cornerRadius='full' width='100%'>
                <hstack backgroundColor='#008A10' width={`${fundraiserInfo ? (raised / fundraiserInfo.goalAmount) * 100 : 0}%`}>
                  <spacer size='medium' shape='square' />
                </hstack>
              </vstack>
              <spacer size='small' />
              <vstack alignment='center middle' width='100%'>
                <button appearance='success' width='100%' maxWidth={30} onPress={() => {
                  if (fundraiserInfo) {
                    console.log("Navigate to:", fundraiserURL); //TODO: remove this logging?
                    context.ui.navigateTo(fundraiserURL);
                  }
                }}>Donate</button>
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

    const cachedPostData = await getCachedForm(context, postId);
    const initialFundraiserInfo = cachedPostData ? cachedPostData.getAllProps(TypeKeys.everyExistingFundraiserInfo) : null;
    const fundraiserRaisedDetails = cachedPostData ? cachedPostData.getAllProps(TypeKeys.fundraiserDetails) : null;
    const initialNonprofitInfo = cachedPostData ? cachedPostData.getAllProps(TypeKeys.everyNonprofitInfo) : null;
    
    const [fundraiserInfo, setFundraiserInfo] = useState<SerializedEveryExistingFundraiserInfo | null>(
      initialFundraiserInfo ? serializeExistingFundraiserResponse(initialFundraiserInfo) : null
    );
    const [raised, setRaised] = useState<number>(fundraiserRaisedDetails ? fundraiserRaisedDetails.raised : 0);
    const [nonprofitInfo, setNonprofitInfo] = useState<EveryNonprofitInfo | null>(initialNonprofitInfo);

    const publicKey = await getEveryPublicKey(context);

    let coverImageUrl: string | null = null;
    if (nonprofitInfo && initialFundraiserInfo) {
      const existingFundraiserDetails = await fetchExistingFundraiserDetails(
        nonprofitInfo.nonprofitID,
        initialFundraiserInfo.id,
        publicKey
      );
      const cloudinaryUrl = existingFundraiserDetails?.fundraiserInfo.coverImageCloudinaryId ?? null;
      console.log(cloudinaryUrl)
      if (cloudinaryUrl) {
        const result = await uploadImageToRedditCDN(cloudinaryUrl, context.media);
        if (typeof result === 'string') {
          coverImageUrl = result;
        } else {
          coverImageUrl = result.mediaUrl;
        }
      } else {
        coverImageUrl = null;
      }
    }

    const [coverImageUrlState, setCoverImageUrl] = useState<string | null>(coverImageUrl);

    // Initialize fundraiserURL state
    const fundraiserUrl = generateFundraiserURL(fundraiserInfo);
    const [fundraiserURL, setFundraiserURL] = useState<string>(fundraiserUrl);

    // Subscribe to real-time updates for live changes to the raised amount
    const updateChannel = useChannel({
      name: 'fundraiser_updates',
      onMessage: (data) => {
        console.log("Received message on fundraiser_updates channel:", data);
        if (data.postId === postId && data.updatedDetails) {
          console.log('Received update for raised amount:', data.updatedDetails.raised);
          setRaised(data.updatedDetails.raised); // Update state with new raised amount
        }
      }
    });
    updateChannel.subscribe();

    // Measure character width using string-pixel-width with a supported font
    const fontStack = "arial";
    const charWidth = pixelWidth('0', { font: fontStack, size: 12 });

    return (
      <blocks>
        {FundraiserView(fundraiserInfo, raised, context, width, height, nonprofitInfo, charWidth, coverImageUrlState, fundraiserURL)}
      </blocks>
    );
  }
}