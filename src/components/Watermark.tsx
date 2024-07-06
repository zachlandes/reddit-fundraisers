import { Devvit } from '@devvit/public-api';

interface WatermarkProps {
  onInfoClick: () => void;
}

export const Watermark: Devvit.BlockComponent<WatermarkProps> = ({ onInfoClick }, context) => {
  return (
    <vstack darkBackgroundColor="#04090A" lightBackgroundColor="#0000000A">
      <hstack height={'1px'} grow darkBackgroundColor="#FFFFFF1A"></hstack>
      <hstack padding="small">
        <spacer size="small" />
        <hstack gap="small" grow alignment="start middle">
          <DevvitLogo />
          <hstack alignment="start middle">
            <text size="small" darkColor="#B8C5C9" lightColor="#000" selectable={false}>
              Powered by
            </text>
            <text selectable={false}>&nbsp;</text>
            <vstack onPress={onInfoClick}>
              <text size="small" darkColor="#B8C5C9" lightColor="#000" selectable={false}>
                Snoowy Day Fund
              </text>
              <hstack height={'1px'} backgroundColor="#B8C5C9"></hstack>
            </vstack>
            <text selectable={false}>&nbsp;</text>
            <text size="small" darkColor='#B8C5C9' lightColor='#000' selectable={false}>
              and
            </text>
            <text selectable={false}>&nbsp;</text>
            <vstack onPress={()=> context.ui.navigateTo("https://every.org")}>
              <text size="small" darkColor="#B8C5C9" lightColor="#000" selectable={false}>
                Every.org
              </text>
              <hstack height={'1px'} backgroundColor="#B8C5C9"></hstack>
            </vstack>
          </hstack>
          <spacer grow />
        </hstack>
      </hstack>
    </vstack>
  );
};

function DevvitLogo() {
  return <image imageHeight={14} imageWidth={14} url={'icon_devvit_fill.png'} />;
}