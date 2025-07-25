import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

export async function POST(request) {
  try {
    const { fileId, fileName, totalChunks, fileSize, fileType } = await request.json();

    // Validate file size (180MB max)
    const maxSize = 180 * 1024 * 1024; // 180MB in bytes
    if (fileSize > maxSize) {
      return NextResponse.json(
        { success: false, message: "File size must be less than 180MB" },
        { status: 400 }
      );
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    const chunksDir = join(uploadsDir, 'chunks', fileId);

    // Verify all chunks exist
    const chunkFiles = readdirSync(chunksDir);
    if (chunkFiles.length !== totalChunks) {
      return NextResponse.json(
        { success: false, message: "Missing chunks" },
        { status: 400 }
      );
    }

    // Reassemble file
    const timestamp = Date.now();
    const extension = fileName.split('.').pop();
    const finalFileName = `${timestamp}_${fileName}`;
    const finalFilePath = join(uploadsDir, finalFileName);

    const chunks = [];
    
    // Read all chunks in order
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(chunksDir, `chunk_${i}`);
      const chunkData = await readFile(chunkPath);
      chunks.push(chunkData);
    }

    // Combine chunks
    const finalBuffer = Buffer.concat(chunks);
    
    // Verify file size
    if (finalBuffer.length !== fileSize) {
      return NextResponse.json(
        { success: false, message: "File size mismatch" },
        { status: 400 }
      );
    }

    // Write final file
    await writeFile(finalFilePath, finalBuffer);

    // Clean up chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = join(chunksDir, `chunk_${i}`);
      await unlink(chunkPath);
    }
    await rmdir(chunksDir);

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully",
      filePath: `/uploads/${finalFileName}`,
      fileInfo: {
        originalName: fileName,
        fileName: finalFileName,
        size: fileSize,
        type: fileType
      }
    });

  } catch (error) {
    console.error('File finalization error:', error);
    return NextResponse.json(
      { success: false, message: "File finalization failed" },
      { status: 500 }
    );
  }
}
