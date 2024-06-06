import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, EveryFundraiserRaisedDetails, SerializedFundraiserCreationResponse } from '../types/index.js';
import { getCachedForm } from '../utils/Redis.js';
import { TypeKeys } from '../utils/typeHelpers.js';
import { getEveryPublicKey } from '../utils/keyManagement.js';
import { serializeFundraiserCreationResponse } from '../utils/dateUtils.js';

export function FundraiserView(fundraiserCreationResponse: SerializedFundraiserCreationResponse | null, raised: number, context: Context, width: number, totalHeight: number): JSX.Element {
    const descriptionMaxHeight = totalHeight - 328; // //FIXME: we need to adjust this value (possibly dynamically for the cover image, maybe statically for the progress bar etc)

    return (
        <vstack width={`${width}px`} alignment='center middle' gap='large'>
            <image url={fundraiserCreationResponse ? fundraiserCreationResponse.links.web : 'placeholder-image-url'}
                width="100%"
                imageWidth={150}
                imageHeight={150}
                description="Fundraiser Image">
            </image>
            <vstack width='100%' padding="medium">
              <text size="xlarge">
                {fundraiserCreationResponse ? fundraiserCreationResponse.title : 'Loading title...'}
              </text>
              <text size='xsmall' weight='bold' wrap overflow="ellipsis" maxHeight={`${descriptionMaxHeight}px`}>
                {fundraiserCreationResponse ? fundraiserCreationResponse.description : 'Loading description...'}
              </text>
              <spacer size='small' /> 
              <hstack width='100%'>
                <hstack width='50%'>
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
                <hstack backgroundColor='#018669' width={`${fundraiserCreationResponse ? (raised / fundraiserCreationResponse.goal) * 100 : 0}%`}>
                  <spacer size='medium' shape='square' />
                </hstack>
              </vstack>
              <vstack alignment='center middle' width='100%'>
                <button appearance='success' width={50} onPress={() => {
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
    const cachedFundraiserData = await getCachedForm(context, postId);
    const initialFundraiserData = cachedFundraiserData ? serializeFundraiserCreationResponse(cachedFundraiserData.getAllProps(TypeKeys.fundraiserCreationResponse)) : null;
    
    const [fundraiserData, setFundraiserData] = useState<SerializedFundraiserCreationResponse | null>(initialFundraiserData);
    const [raised, setRaised] = useState<number>(cachedFundraiserData ? cachedFundraiserData.getAllProps(TypeKeys.fundraiserCreationResponse).amountRaised : 0); 

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

    return (
      <blocks>
        {FundraiserView(fundraiserData, raised, context, width, height)}
      </blocks>
    );
  }
}
