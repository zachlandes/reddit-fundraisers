import {Devvit} from '@devvit/public-api'

type ContainerCornerRadius = Devvit.Blocks.ContainerCornerRadius;

/**
 * Props for the CircularLogo component.
 * @param url - The URL of the image to display.
 * @param size - Optional size of the logo, defaults to 35px.
 * @param description - Optional description for the image, defaults to "Logo".
 */
interface CircularLogoProps {
    url: string;
    size?: number;
    description?: string;
    onPress?: () => void;
}

/**
 * Determines the appropriate corner radius based on the size of the component.
 * @param size - The size of the logo.
 * @returns The corner radius as a string.
 */
function getCornerRadius(size: number): ContainerCornerRadius {
  if (size >= 32) return 'large';
  if (size >= 16) return 'medium';
  if (size >= 8) return 'small';
  return 'none';
}

/**
 * Renders a CircularLogo component with a dynamic corner radius based on its size.
 * @param props - The properties of the CircularLogo component.
 * @returns A JSX element representing the logo with a dynamic corner radius.
 */
export const CircularLogo: Devvit.BlockComponent<CircularLogoProps> = ({
  url,
  size = 35,
  description = "Logo",
  onPress
}) => {
  return (
    <zstack width={`${size}px`} height={`${size}px`} onPress={onPress}>
      <vstack cornerRadius={getCornerRadius(size)} backgroundColor="white" width={`${size}px`} height={`${size}px`}>
        <image
          url={url}
          imageWidth={size}
          imageHeight={size}
          resizeMode="cover"
          description={description}
        />
      </vstack>
    </zstack>
  );
};
