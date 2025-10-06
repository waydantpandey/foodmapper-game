// Cloudinary configuration and utilities
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryImage {
  public_id: string;
  url: string;
  width: number;
  height: number;
  format: string;
  alt_text?: string;
}

export class CloudinaryService {
  // Upload image to Cloudinary
  async uploadImage(
    file: File | Buffer | string,
    folder: string = 'food-guessing-game',
    options: {
      public_id?: string;
      transformation?: any;
      tags?: string[];
    } = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        folder,
        resource_type: 'image' as const,
        quality: 'auto' as const,
        fetch_format: 'auto' as const,
        ...options,
      };

      // Convert File to Buffer if needed
      let fileToUpload: string | Buffer;
      if (file instanceof File) {
        const arrayBuffer = await file.arrayBuffer();
        fileToUpload = Buffer.from(arrayBuffer);
      } else {
        fileToUpload = file;
      }

      const result = await cloudinary.uploader.upload(fileToUpload as any, uploadOptions);
      
      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  // Upload multiple images for a dish
  async uploadDishImages(
    images: (File | Buffer | string)[],
    dishName: string,
    countryName: string
  ): Promise<CloudinaryImage[]> {
    const folder = `food-guessing-game/${countryName.toLowerCase().replace(/\s+/g, '-')}/${dishName.toLowerCase().replace(/\s+/g, '-')}`;
    const results: CloudinaryImage[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const result = await this.uploadImage(images[i], folder, {
          public_id: `${dishName.toLowerCase().replace(/\s+/g, '-')}_${i + 1}`,
          tags: [countryName.toLowerCase(), dishName.toLowerCase(), 'food'],
        });

        results.push({
          public_id: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          format: result.format,
          alt_text: `${dishName} - Image ${i + 1}`,
        });
      } catch (error) {
        console.error(`Failed to upload image ${i + 1} for ${dishName}:`, error);
        // Continue with other images even if one fails
      }
    }

    return results;
  }

  // Delete image from Cloudinary
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  }

  // Delete multiple images
  async deleteImages(publicIds: string[]): Promise<void> {
    try {
      await cloudinary.api.delete_resources(publicIds);
    } catch (error) {
      console.error('Cloudinary bulk delete error:', error);
      throw new Error('Failed to delete images from Cloudinary');
    }
  }

  // Get optimized image URL
  getOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string | number;
      format?: string;
      crop?: string;
    } = {}
  ): string {
    const {
      width,
      height,
      quality = 'auto',
      format = 'auto',
      crop = 'fill',
    } = options;

    const transformations: string[] = [];
    
    if (width) transformations.push(`w_${width}`);
    if (height) transformations.push(`h_${height}`);
    if (quality) transformations.push(`q_${quality}`);
    if (format) transformations.push(`f_${format}`);
    if (crop) transformations.push(`c_${crop}`);

    const transformationString = transformations.join(',');
    
    return cloudinary.url(publicId, {
      transformation: transformationString ? [{ [transformationString]: true }] : undefined,
    });
  }

  // Get responsive image URLs for different screen sizes
  getResponsiveImageUrls(publicId: string): {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  } {
    return {
      thumbnail: this.getOptimizedImageUrl(publicId, { width: 150, height: 150, crop: 'fill' }),
      small: this.getOptimizedImageUrl(publicId, { width: 400, height: 300, crop: 'fill' }),
      medium: this.getOptimizedImageUrl(publicId, { width: 800, height: 600, crop: 'fill' }),
      large: this.getOptimizedImageUrl(publicId, { width: 1200, height: 900, crop: 'fill' }),
      original: this.getOptimizedImageUrl(publicId),
    };
  }

  // List images in a folder
  async listImages(folder: string): Promise<CloudinaryImage[]> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: folder,
        max_results: 500,
      });

      return result.resources.map((resource: any) => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
      }));
    } catch (error) {
      console.error('Cloudinary list error:', error);
      throw new Error('Failed to list images from Cloudinary');
    }
  }

  // Get image details
  async getImageDetails(publicId: string): Promise<CloudinaryImage> {
    try {
      const result = await cloudinary.api.resource(publicId);
      
      return {
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary get details error:', error);
      throw new Error('Failed to get image details from Cloudinary');
    }
  }
}

export const cloudinaryService = new CloudinaryService();
