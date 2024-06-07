declare module 'string-pixel-width' {
    interface Options {
      font?: string;
      size?: number;
      bold?: boolean;
      italic?: boolean;
    }
  
    function pixelWidth(text: string, options?: Options): number;
  
    export = pixelWidth;
  }