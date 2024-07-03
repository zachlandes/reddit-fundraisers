import { Devvit } from '@devvit/public-api';

interface FullScreenOverlayProps {
    onClose: () => void;
    children: JSX.Element | JSX.Element[];
    mobileWidth: number;
}

export function FullScreenOverlay({ onClose, children, mobileWidth }: FullScreenOverlayProps): JSX.Element {
    const borderGray = '#C0C0C0';

    return (
        <vstack maxWidth={`${mobileWidth}px`} width={100} height={100} borderColor={borderGray} border='thin' backgroundColor="neutral-background">
            <vstack width={100} height={100} padding="medium">
                <hstack width={100} alignment="end">
                    <button onPress={onClose} icon="close" size='small'/>
                </hstack>
                <spacer size='xsmall' />
                {children}
            </vstack>
        </vstack>
    );
}