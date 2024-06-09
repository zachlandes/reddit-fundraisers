import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, EveryFundraiserRaisedDetails, SerializedFundraiserCreationResponse, EveryNonprofitInfo } from '../types/index.js';
import { getCachedForm } from '../utils/Redis.js';
import { TypeKeys } from '../utils/typeHelpers.js';
import { getEveryPublicKey } from '../utils/keyManagement.js';
import { serializeFundraiserCreationResponse } from '../utils/dateUtils.js';
import { usePagination } from '@devvit/kit';
import { paginateText } from '../utils/renderUtils.js';
import pixelWidth from 'string-pixel-width';
import { fetchExistingFundraiserDetails } from '../sources/Every.js';

export function FundraiserView(
  fundraiserCreationResponse: SerializedFundraiserCreationResponse | null,
  raised: number,
  context: Context,
  width: number,
  totalHeight: number,
  nonprofitInfo: EveryNonprofitInfo | null,
  charWidth: number,
  coverImageUrl: string | null
): JSX.Element {
    const { useState } = context;
    const descriptionMaxHeight = totalHeight - 398; 
    const lineHeight = 16;
    const lineWidth = width + 60; 
    const imageHeight = 150; // Height of the cover image
    const logoHeight = 30; // Height of the logo image
    //FIXME: we should think carefully about how we obtain these values, e.g. what should be dynamic, what should be based on the (potentially cached) image dimensions, etc.
    const descriptionPages = fundraiserCreationResponse
        ? paginateText(fundraiserCreationResponse.description, descriptionMaxHeight, lineHeight, lineWidth, charWidth, imageHeight, logoHeight)
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
                {fundraiserCreationResponse ? fundraiserCreationResponse.title : 'A fundraiser!'}
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
                        <text weight='bold'>${fundraiserCreationResponse ? fundraiserCreationResponse.goal : '0'}</text>
                        <text color='#706E6E'>Next milestone</text>
                    </vstack>
                </hstack>
              </hstack>
              <vstack backgroundColor='#f3f7f7' cornerRadius='full' width='100%'>
                <hstack backgroundColor='#008A10' width={`${fundraiserCreationResponse ? (raised / fundraiserCreationResponse.goal) * 100 : 0}%`}>
                  <spacer size='medium' shape='square' />
                </hstack>
              </vstack>
              <spacer size='small' />
              <vstack alignment='center middle' width='100%'>
                <button appearance='success' width='100%' maxWidth={30} onPress={() => {
                  if (fundraiserCreationResponse) {
                    console.log("Navigate to:", fundraiserCreationResponse.links.web);
                    context.ui.navigateTo(fundraiserCreationResponse.links.web);
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
    const initialFundraiserData = cachedPostData ? serializeFundraiserCreationResponse(cachedPostData.getAllProps(TypeKeys.fundraiserCreationResponse)) : null;
    const initialNonprofitInfo = cachedPostData ? cachedPostData.getAllProps(TypeKeys.everyNonprofitInfo) : null;
    
    const [fundraiserData, setFundraiserData] = useState<SerializedFundraiserCreationResponse | null>(initialFundraiserData);
    const [raised, setRaised] = useState<number>(cachedPostData ? cachedPostData.getAllProps(TypeKeys.fundraiserCreationResponse).amountRaised : 0); 
    const [nonprofitInfo, setNonprofitInfo] = useState<EveryNonprofitInfo | null>(initialNonprofitInfo);

    const publicKey = await getEveryPublicKey(context);

    let coverImageUrl: string | null = null;
    if (nonprofitInfo && fundraiserData) {
      const existingFundraiserDetails = await fetchExistingFundraiserDetails(
        nonprofitInfo.nonprofitID,
        fundraiserData.id,
        publicKey
      );
      coverImageUrl = existingFundraiserDetails?.coverImageCloudinaryId ?? null;
    }

    const [coverImageUrlState, setCoverImageUrl] = useState<string | null>(coverImageUrl);

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
        {FundraiserView(fundraiserData, raised, context, width, height, nonprofitInfo, charWidth, coverImageUrlState)}
      </blocks>
    );
  }
}