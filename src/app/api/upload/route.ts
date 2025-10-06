import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary';

// POST /api/upload - Upload images to Cloudinary
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('images') as File[];
    const dishName = formData.get('dishName') as string;
    const countryName = formData.get('countryName') as string;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    if (!dishName || !countryName) {
      return NextResponse.json(
        { error: 'Dish name and country name are required' },
        { status: 400 }
      );
    }

    // Upload images to Cloudinary
    const uploadedImages = await cloudinaryService.uploadDishImages(
      files,
      dishName,
      countryName
    );

    return NextResponse.json({ 
      success: true, 
      data: uploadedImages 
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
