import { CustomPostType, Devvit } from '@devvit/public-api';
import { EveryFundraiserInfo } from '../sources/Every.js';



export function FundraiserView(fundraiserInfo: EveryFundraiserInfo): JSX.Element {
    return (
        <vstack alignment='center middle' gap='large' grow={true}>
            <vstack>
              <image url="https://external-preview.redd.it/puppy-shark-doo-doo-dooo-v0-fvTbUdWIl5sAZpJzzafgu-dSbbwB9cZjADc4PkQDmNw.jpg?auto=webp&s=79a1b5de3973f6499d7785abf95c2a02387e3e78"
                width="100%"
                imageWidth={150}
                imageHeight={150}
                description="Generative artwork: Fuzzy Fingers">
              </image>
              <text size="xlarge">
                Love
              </text>
              <text size='xsmall' weight='bold'>
                Love + Ethos’ mission is  ... 👋
                {fundraiserInfo.title}
              </text>
              <vstack backgroundColor='#FFD5C6' cornerRadius='full' width='100%'>
                <hstack backgroundColor='#D93A00' width={`50%`}>
                  <spacer size='medium' shape='square' />
                </hstack>
              </vstack>
              <hstack>
                <vstack>
                  <text>RAISED</text>
                  <text color='#018669'>$100000</text>
                </vstack>
                <vstack>
                  <text>NEXT MILESTONE</text>
                  <text color='#018669'>$200000</text>
                </vstack>
              </hstack>
              <vstack alignment='center middle'>
                <button appearance='primary' width={50}>Donate</button>
              </vstack>
            </vstack>
            {/* <vstack>
              <text>stack 2</text>
            </vstack> */}
        </vstack>
    )
}

export const FundraiserPost: CustomPostType = {
    name: "FundraiserPost",
    description: "Post fundraiser",
    height: "tall",
    render: context => {
      // get data for post and add to FundraiserView
      let fInfo = {
          nonprofitID: "2",
          title: "FUNDRAISER INFO TITLE",
          description: "Desc",
          startDate: null,
          endDate: null,
          goal: 420,
          raisedOffline: 69,
          imageBase64: null
      };
      console.log(context)
      return FundraiserView(fInfo)
    }
}