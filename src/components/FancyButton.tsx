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
  iconPosition?: 'left' | 'right'
  isExpanded?: boolean
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
  iconPosition = 'left',
  isExpanded = false, //animate by alternating to true
  ...elemProps
}) => {
  function handlePress(e: Devvit.Blocks.OnPressEvent) {
    onPress(e)
  }

  const buttonHeight = height;//isExpanded ? height + 2 : height;
  const buttonBackgroundColor = isExpanded ? adjust(backgroundColor, 20) : backgroundColor;

  return (
    <vstack {...sharedProps} maxWidth="100px" height={`${buttonHeight}px`} onPress={handlePress} {...elemProps}>
      <zstack height={`${buttonHeight}px`}>
        <vstack {...sharedProps} height={`${buttonHeight}px`} backgroundColor='black' />
        <vstack {...sharedProps} height={`${buttonHeight - 1}px`} backgroundColor={adjust(buttonBackgroundColor, -50)} />
        <vstack {...sharedProps} height={`${buttonHeight - 4}px`} backgroundColor='white'></vstack>
        <vstack {...sharedProps}>
          <vstack {...sharedProps} height={"1px"} />
          <vstack {...sharedProps} height={`${buttonHeight - 5}px`} backgroundColor={buttonBackgroundColor}>
            <hstack height="100%" alignment='middle center' gap="small">
              {(icon && iconPosition === 'left') ? <icon name={icon} color={textColor} /> : null}
              <text color={textColor} size="large">
                {children}
              </text>
              {(icon && iconPosition === 'right') ? <icon name={icon} color={textColor} /> : null}
            </hstack>
          </vstack>
        </vstack>
      </zstack>
    </vstack>
  )
}
