

export function LoadingView(
    fundraiserInfo: SerializedEveryExistingFundraiserInfo | null,
    raised: number,
    goal: number | null,
    goalType: string,
    context: Context,
    width: number,
    totalHeight: number,
    nonprofitInfo: EveryNonprofitInfo | null, // TODO: Figure out if this is cached coming in
    charWidth: number,
    coverImageUrl: string | null,
    fundraiserURL: string
  ): JSX.Element {
    return (
        <vstack width={`${width}px`} gap='small'>
            <text size="xlarge">{"Loading!"}</text>
        </vstack>
    )
}

