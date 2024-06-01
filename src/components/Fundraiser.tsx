import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { EveryFundraiserInfo } from '../sources/Every.js';
import { returnCachedFormAsJSON } from '../utils/Redis.js';
import { CachedForm } from '../utils/CachedForm.js';



export function FundraiserView(fundraiserInfo: EveryFundraiserInfo, link: string, context: Context): JSX.Element {
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
                Love + Ethos' mission is  ... 👋
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
                  <text color='#018669'>$69</text>
                </vstack>
                <vstack>
                  <text>NEXT MILESTONE</text>
                  <text color='#018669'>${fundraiserInfo.goal}</text>
                </vstack>
              </hstack>
              <vstack alignment='center middle'>
                <button appearance='primary' width={50}onPress={() => context.ui.navigateTo(link)}>Donate</button>
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
    render: async context => { 
      const { postId } = context;
      if (typeof postId === 'string') {
        console.log("postId in custompostypeform: ", postId)
        const cachedForm = await returnCachedFormAsJSON(context, postId);  
        console.log("cachedForm in custompostType form: ", cachedForm)
        let fInfo = {
            nonprofitID: "2",
            title: "FUNDRAISER INFO TITLE",
            description: cachedForm?.formFields.formDescription ?? "No description",  
            startDate: null,
            endDate: null,
            goal: 420,
            raisedOffline: 69,
            imageBase64: null
        };
        const link = cachedForm?.formFields.link ?? "No link"
        return FundraiserView(fInfo, link, context); //FIXME: we need to refactor how we are storing all the relevant data for a post
      } else {
        throw new Error("postId was undefined"); //FIXME: If we have a failure here, will we end up creating a broken post?
      }
    }
}

