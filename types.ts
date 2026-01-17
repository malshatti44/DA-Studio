
export interface ProductDetails {
  title: string;
  price: string;
  sku: string;
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export interface ImageConfig {
  size: ImageSize;
  aspectRatio: AspectRatio;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GenerationResult {
  imageUrl: string;
  metadata?: any;
}
