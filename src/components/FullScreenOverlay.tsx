import { Devvit } from '@devvit/public-api';

interface FullScreenOverlayProps {
    onClose: () => void;
    children: JSX.Element | JSX.Element[];
    maxWidth: number;
}

export function FullScreenOverlay({ onClose, children, maxWidth: width }: FullScreenOverlayProps): JSX.Element {
    const borderGray = '#C0C0C0';

    return (
        <vstack maxWidth={`${width}px`} width={100} height={100} borderColor={borderGray} border='thin' backgroundColor="neutral-background">
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