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
  PADDING_HEIGHT: number;
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
    PADDING_HEIGHT: 16,
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
  availableDescriptionHeight: number;
  fundraiserInfoHeight: number;
  lineWidth: number;
  descriptionMaxHeight: number;
} {
  const viewportType = getViewportType(width);
  const config = VIEWPORT_CONFIGS[viewportType];
  
  if (viewportType === 'mobile') {
    const mobileConfig = config as MobileConfig;  // This cast is safe because we know it's mobile
    
    const boundedWidth = Math.min(Math.max(width, mobileConfig.MOBILE_WIDTH), VIEWPORT_CONFIGS.shared.MAX_COLUMN_WIDTH);
    const lineWidth = boundedWidth - 80;
    
    const fundraiserInfoHeight = Math.floor(Math.min(height, VIEWPORT_CONFIGS.shared.MAX_HEIGHT) * mobileConfig.FUNDRAISER_INFO_HEIGHT_RATIO);
    const descriptionMaxHeight = fundraiserInfoHeight - mobileConfig.TITLE_HEIGHT;
    const availableDescriptionHeight = descriptionMaxHeight - mobileConfig.PADDING_HEIGHT - 2 * mobileConfig.XSMALL_SPACER_HEIGHT;

    return {
      viewportType,
      config: mobileConfig,
      availableDescriptionHeight,
      fundraiserInfoHeight,
      lineWidth,
      descriptionMaxHeight,
    };
  } else {
    // Handle other viewport types if needed
    // For now, we'll throw an error since we're only supporting mobile
    throw new Error('Unsupported viewport type');
  }
}