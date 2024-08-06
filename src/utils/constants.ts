// Define a base config type with shared properties
export type BaseConfig = {
  MAX_COLUMN_WIDTH: number;
  MAX_HEIGHT: number;
  OVERLAY_CONTROLS_HEIGHT: number;
};

// Define a mobile config type that extends the base config
export type MobileConfig = BaseConfig & {
  MOBILE_WIDTH: number;
  TITLE_HEIGHT: number;
  LINE_HEIGHT: number;
  MEDIUM_PADDING_HEIGHT: number;
  XSMALL_SPACER_HEIGHT: number;
  FONT_SIZE: number;
  FONT_FAMILY: string;
  FUNDRAISER_INFO_HEIGHT_RATIO: number;
};

export const VIEWPORT_CONFIGS = {
  shared: {
    MAX_COLUMN_WIDTH: 640,
    MAX_HEIGHT: 512,
    OVERLAY_CONTROLS_HEIGHT: 64,
  } as BaseConfig,
  mobile: {
    MOBILE_WIDTH: 320,
    TITLE_HEIGHT: 26,
    LINE_HEIGHT: 16,
    MEDIUM_PADDING_HEIGHT: 16,
    XSMALL_SPACER_HEIGHT: 4,
    FONT_SIZE: 12,
    FONT_FAMILY: "helvetica",
    FUNDRAISER_INFO_HEIGHT_RATIO: 0.41,
  } as MobileConfig,
} as const;

export type ViewportType = keyof typeof VIEWPORT_CONFIGS;

export function getViewportType(width: number): ViewportType {
  if (width < 768) {
    return 'mobile';
  } else {
    return 'mobile'; // Default to mobile for now
  }
}

export function calculateLayout(height: number, width: number): {
  viewportType: ViewportType;
  config: BaseConfig | MobileConfig;
  fundraiserInfoHeight: number;
  lineWidth: number;
  descriptionMaxHeight: number;
  titleHeight: number;
  lineHeight: number;
  mediumPaddingHeight: number;
  xsmallSpacerHeight: number;
  coverImageHeight: number;
  bottomSectionHeight: number;
  overlayDescriptionMaxHeight: number;
} {
  
  if (isNaN(height) || isNaN(width)) {
    console.error(`calculateLayout received NaN input - height: ${height}, width: ${width}`);
    // Set default values for height and width
    height = VIEWPORT_CONFIGS.shared.MAX_HEIGHT;
    width = VIEWPORT_CONFIGS.mobile.MOBILE_WIDTH;
  }

  const viewportType = getViewportType(width);
  const config = VIEWPORT_CONFIGS[viewportType];
  
  if (viewportType === 'mobile') {
    const mobileConfig = config as MobileConfig;
    
    const boundedWidth = Math.min(Math.max(width, mobileConfig.MOBILE_WIDTH), VIEWPORT_CONFIGS.shared.MAX_COLUMN_WIDTH);
    
    const lineWidth = boundedWidth - 80;
    
    const totalHeight = Math.min(height, VIEWPORT_CONFIGS.shared.MAX_HEIGHT);
    const fundraiserInfoHeight = Math.floor(totalHeight * mobileConfig.FUNDRAISER_INFO_HEIGHT_RATIO);
    const titleHeight = mobileConfig.TITLE_HEIGHT;
    const lineHeight = mobileConfig.LINE_HEIGHT;
    const mediumPaddingHeight = mobileConfig.MEDIUM_PADDING_HEIGHT;
    const xsmallSpacerHeight = mobileConfig.XSMALL_SPACER_HEIGHT;
    const coverImageHeight = Math.floor(totalHeight * 0.30);
    const bottomSectionHeight = totalHeight - fundraiserInfoHeight - coverImageHeight;
    const overlayDescriptionMaxHeight = totalHeight - VIEWPORT_CONFIGS.shared.OVERLAY_CONTROLS_HEIGHT;
    const descriptionMaxHeight = fundraiserInfoHeight - titleHeight - 2 * lineHeight;

    return {
      viewportType,
      config: mobileConfig,
      fundraiserInfoHeight,
      lineWidth: lineWidth || mobileConfig.MOBILE_WIDTH - 80, // Add fallback
      descriptionMaxHeight,
      titleHeight,
      lineHeight,
      mediumPaddingHeight: mediumPaddingHeight,
      xsmallSpacerHeight,
      coverImageHeight,
      bottomSectionHeight,
      overlayDescriptionMaxHeight,
    };
  } else {
    throw new Error('Unsupported viewport type');
  }
}