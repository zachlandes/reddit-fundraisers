/* FancyButton by u/Block_Parser

How to use:
Replace button code with
<vstack alignment='center middle' width='100%'>
  <FancyButton
    icon="day"
    backgroundColor="#008A10"
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
</vstack>

**/
import {Devvit} from '@devvit/public-api'

interface FancyButtonProps extends Omit<Devvit.Blocks.StackProps, "onPress"> {
  height?: number
  children: string
  onPress: Devvit.Blocks.OnPressEventHandler
  textColor?: Devvit.Blocks.ColorString
  backgroundColor?: `#${string}`
  icon?: Devvit.Blocks.IconProps["name"]
}

const sharedProps: Partial<FancyButtonProps> = {
  cornerRadius: "small",
  width: "100%"
}

function adjust(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

export const FancyButton: Devvit.BlockComponent<FancyButtonProps> = ({
  height = 50,
  backgroundColor = "#d26759",
  textColor = "white",
  children,
  onPress,
  icon,
  ...elemProps
}) => {
  function handlePress(e: Devvit.Blocks.OnPressEvent) {
    onPress(e)
  }
  return (
    <vstack {...sharedProps} maxWidth="100px" height={`${height}px`} onPress={handlePress} {...elemProps}>
      <zstack height={`${height}px`}>
        <vstack {...sharedProps} height={`${height}px`} backgroundColor='black' />
        <vstack {...sharedProps} height={`${height - 1}px`} backgroundColor={adjust(backgroundColor, -50)} />
        <vstack {...sharedProps} height={`${height - 4}px`} backgroundColor='white'></vstack>
        <vstack {...sharedProps}>
          <vstack {...sharedProps} height={"1px"} />
          <vstack {...sharedProps} height={`${height - 5}px`} backgroundColor={backgroundColor}>
            <hstack height="100%" alignment='middle center' gap="small">
              {icon? <icon name={icon} color={textColor} /> : null}
              <text color={textColor} size="large">
                {children}
              </text>
            </hstack>
          </vstack>
        </vstack>
      </zstack>
    </vstack>
  )
}

