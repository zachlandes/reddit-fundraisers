import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { Currency, FundraiserCreationResponse, EveryFundraiserRaisedDetails, SerializedFundraiserCreationResponse } from '../types/index.js';
import { getCachedForm } from '../utils/Redis.js';
import { TypeKeys } from '../utils/typeHelpers.js';
import { getEveryPublicKey } from '../utils/keyManagement.js';
import { serializeFundraiserCreationResponse } from '../utils/dateUtils.js';

export function FundraiserView(fundraiserCreationResponse: SerializedFundraiserCreationResponse | null, raised: number, context: Context): JSX.Element {
    console.log("Rendering FundraiserView", { fundraiserCreationResponse, raised });
    return (
        <vstack alignment='center middle' gap='large' grow={true}>
            <vstack>
              <image url={fundraiserCreationResponse ? fundraiserCreationResponse.links.web : 'placeholder-image-url'}
                width="100%"
                imageWidth={150}
                imageHeight={150}
                description="Fundraiser Image">
              </image>
              <text size="xlarge">
                {fundraiserCreationResponse ? fundraiserCreationResponse.title : 'Loading title...'}
              </text>
              <text size='xsmall' weight='bold'>
                {fundraiserCreationResponse ? fundraiserCreationResponse.description : 'Loading description...'}
              </text>
              <vstack backgroundColor='#FFD5C6' cornerRadius='full' width='100%'>
                <hstack backgroundColor='#D93A00' width={`${fundraiserCreationResponse ? (raised / fundraiserCreationResponse.goal) * 100 : 0}%`}>
                  <spacer size='medium' shape='square' />
                </hstack>
              </vstack>
              <hstack>
                <vstack>
                  <text>RAISED</text>
                  <text color='#018669'>${raised}</text>
                </vstack>
                <vstack>
                  <text>NEXT MILESTONE</text>
                  <text color='#018669'>${fundraiserCreationResponse ? fundraiserCreationResponse.goal : '0'}</text>
                </vstack>
              </hstack>
              <vstack alignment='center middle'>
                <button appearance='primary' width={50} onPress={() => {
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
    console.log("Starting render of FundraiserPost");
    const { postId, useChannel, useState } = context;
    
    if (typeof postId !== 'string') {
      throw new Error('postId is undefined');
    }
    const cachedFundraiserData = await getCachedForm(context, postId);
    const initialFundraiserData = cachedFundraiserData ? serializeFundraiserCreationResponse(cachedFundraiserData.getAllProps(TypeKeys.fundraiserCreationResponse)) : null;
    
    // Initialize state with cached values
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

    return FundraiserView(fundraiserData, raised, context);
  }
}
