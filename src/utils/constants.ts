export const VIEWPORT_CONFIGS = {
  mobile: {
    MOBILE_WIDTH: 320,
    TITLE_HEIGHT: 26,
    LINE_HEIGHT: 16,
    PADDING_HEIGHT: 16, //8px top + 8px bottom for small padding
    XSMALL_SPACER_HEIGHT: 4,
    FONT_SIZE: 12,
    FONT_FAMILY: "helvetica",
    FUNDRAISER_INFO_HEIGHT_RATIO: 0.44,
  },
  // Add more viewport configurations as needed
};

export type ViewportType = keyof typeof VIEWPORT_CONFIGS;

export function getViewportType(width: number): ViewportType {
  if (width < 768) {
    return 'mobile';
    // Add more conditions as needed
  } else {
    return 'mobile'; // Default to mobile for now
  }
}

export function calculateLayout(height: number, width: number) {
  const viewportType = getViewportType(width);
  const config = VIEWPORT_CONFIGS[viewportType];

  const fundraiserInfoHeight = Math.floor(height * config.FUNDRAISER_INFO_HEIGHT_RATIO);
  const lineWidth = config.MOBILE_WIDTH - 80;
  const descriptionMaxHeight = fundraiserInfoHeight - config.TITLE_HEIGHT - 34;
  const availableDescriptionHeight = descriptionMaxHeight - config.PADDING_HEIGHT - 2 * config.XSMALL_SPACER_HEIGHT;

  return {
    viewportType,
    config,
    fundraiserInfoHeight,
    lineWidth,
    descriptionMaxHeight,
    availableDescriptionHeight,
  };
}
