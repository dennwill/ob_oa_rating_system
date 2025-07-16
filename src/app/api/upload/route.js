import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises'
import path from 'path';

async function authenticateAdmin(request) {
    const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json(
              { error: 'Access token required' },
              { status: 401 }
            );
    }
      const token = authHeader.split(' ')[1];
      let currentUser;
      try {
          currentUser = verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
          return NextResponse.json(
              { error: 'Invalid token' },
              { status: 401 }
            );
    }
      if (currentUser.exp && Date.now() >= currentUser.exp * 1000) {
          return NextResponse.json(
              { error: 'Token expired' },
              { status: 401 }
            );
    }
      if (!currentUser.isAdmin) {
          return NextResponse.json(
              { error: 'Admin access required' },
              { status: 403 }
            );
    }
      
    return currentUser;
}

// POST - Upload profile picture
export async function POST(request) {
    try {
        const currentUser = authenticateAdmin(request);
        const formData = await request.formData();
        const file = formData.get('file');
        const employeeId = formData.get('employeeId');

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' },
                { status: 400 }
            );
        }

        // validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size too large. Maximum size is 5MB' },
                { status: 400 }
            );
        }

        // Create uploads directory if it doesn't exist
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        try {
            await mkdir(uploadsDir, { recursive: true });

        } catch (error) {
            // Directory might already exist
        }

        // generate unique filename
        const timestamp = Date.now();
        const fileExtension = path.extname(file.name);
        const fileName = employeeId
        ? `employee-${employeeId}-${timestamp}${fileExtension}`
        : `profile-${timestamp}${fileExtension}`;

        const filePath = path.join(uploadsDir, fileName);

        // convert file to buffer and save
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // return the file URL
        const fileUrl = `/uploads/${fileName}`;

        return NextResponse.json({
            message: 'File uploaded successfully',
            fileUrl,
            fileName,
            fileSize: file.size,
            fileType: file.type
        });

    } catch (error) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}

// DELETE - remove profile picture
export async function DELETE(request) {
    try {
        const currentUser = authenticateAdmin(request);
        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get('fileName');

        // In a real application, you would delete the file from storage
        // For now, we'll just return success
        // const filePath = path.join(process.cwd(), 'public', 'uploads', fileName);
        // await unlink(filePath);

        if (!fileName) {
            return NextResponse.json({
                message: 'File deleted successfully',
                fileName
            });
        }
    } catch (error) {
        console.error('File deletion error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Admin access required' ? 403 : 500 }
        );
    }
}