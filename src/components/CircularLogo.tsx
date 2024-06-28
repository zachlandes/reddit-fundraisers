import {Devvit} from '@devvit/public-api'

type ContainerCornerRadius = Devvit.Blocks.ContainerCornerRadius;

interface CircularLogoProps {
    url: string;
    size?: number;
    description?: string;
}

function getCornerRadius(size: number): ContainerCornerRadius {
  if (size >= 32) return 'large';
  if (size >= 16) return 'medium';
  if (size >= 8) return 'small';
  return 'none';
}

export const CircularLogo: Devvit.BlockComponent<CircularLogoProps> = ({
  url,
  size = 35,
  description = "Logo"
}) => {
  return (
    <zstack width={`${size}px`} height={`${size}px`}>
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

