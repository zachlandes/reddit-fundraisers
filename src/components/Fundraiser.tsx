import { Context, CustomPostType, Devvit } from '@devvit/public-api';
import { EveryFundraiserInfo, EveryNonprofitInfo } from '../sources/Every.js';
import { getCachedForm } from '../utils/Redis.js';
import { CachedForm, FundraiserFormFields, TypeKeys } from '../utils/CachedForm.js';




export function FundraiserView(fundraiserInfo: EveryFundraiserInfo, context: Context): JSX.Element {
    return (
        <vstack alignment='center middle' gap='large' grow={true}>
            <vstack>
              <image url={"https://external-preview.redd.it/puppy-shark-doo-doo-dooo-v0-fvTbUdWIl5sAZpJzzafgu-dSbbwB9cZjADc4PkQDmNw.jpg?auto=webp&s=79a1b5de3973f6499d7785abf95c2a02387e3e78"}
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
                <button appearance='primary' width={50}onPress={() => context.ui.navigateTo("No link")}>Donate</button>
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
      const cachedForm = await getCachedForm(context, postId);

      if (!cachedForm) {
        throw new Error("Failed to retrieve cached form.");
      }

      // Extract formFields and nonprofitProps from cachedForm using the defined keys
      const formFields = cachedForm.getAllProps(TypeKeys.fundraiserFormFields);
      const nonprofitProps = cachedForm.getAllProps(TypeKeys.everyNonprofitInfo);

      if (!formFields || !nonprofitProps) {
        throw new Error("Form fields or nonprofit properties are missing.");
      }

      // Create a fundraiserInfo object using properties from nonprofitProps and formFields
      let fundraiserInfo: EveryFundraiserInfo = {
          nonprofitID: nonprofitProps.ein, // FIXME: EIN may not be the right ID here
          title: formFields.formDescription ?? "No description",
          description: nonprofitProps.description,
          startDate: null,
          endDate: null,
          goal: 420,
          raisedOffline: 69,
          imageBase64: null
      };

      // Pass the entire formFields and fundraiserInfo to FundraiserView
      return FundraiserView(fundraiserInfo, context);
    } else {
      throw new Error("postId was undefined");
    }
  }
}

