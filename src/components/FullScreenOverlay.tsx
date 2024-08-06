import { Devvit } from '@devvit/public-api';

interface FullScreenOverlayProps {
    onClose: () => void;
    children: JSX.Element | JSX.Element[];
    minWidth: number;
    maxWidth: number;
    maxHeight: number;
}

export function FullScreenOverlay({ onClose, children, minWidth, maxWidth, maxHeight }: FullScreenOverlayProps): JSX.Element {
    const borderGray = '#C0C0C0';

    return (
        <vstack 
            minWidth={`${minWidth}px`}
            width={100}
            maxWidth={`${maxWidth}px`}
            height={100} 
            maxHeight={`${maxHeight}px`}
            borderColor={borderGray} 
            border='thin' 
            backgroundColor="neutral-background"
        >
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