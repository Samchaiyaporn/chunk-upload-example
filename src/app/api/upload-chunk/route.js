import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    const chunk = formData.get('chunk');
    const chunkIndex = parseInt(formData.get('chunkIndex'));
    const totalChunks = parseInt(formData.get('totalChunks'));
    const fileId = formData.get('fileId');
    const fileName = formData.get('fileName');
    const fileSize = parseInt(formData.get('fileSize'));

    if (!chunk || !fileId || !fileName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file size (180MB max)
    const maxSize = 180 * 1024 * 1024; // 180MB in bytes
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, message: "File size must be less than 180MB" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const chunksDir = join(uploadsDir, 'chunks', fileId);
    
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    
    if (!existsSync(chunksDir)) {
      await mkdir(chunksDir, { recursive: true });
    }

    // Save chunk
    const bytes = await chunk.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const chunkPath = join(chunksDir, `chunk_${chunkIndex}`);
    
    await writeFile(chunkPath, buffer);

    return NextResponse.json({
      success: true,
      message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
      chunkIndex,
      totalChunks
    });

  } catch (error) {
    console.error('Chunk upload error:', error);
    return NextResponse.json(
      { success: false, message: "Chunk upload failed" },
      { status: 500 }
    );
  }
}
