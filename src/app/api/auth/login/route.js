import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from '@/lib/database';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        isAdmin: user.is_admin,
        userType: user.user_type
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // return user profile without password
    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      profilePicture: user.profile_picture,
      isAdmin: user.is_admin,
      userType: user.user_type
    };

    // add employee-specific fields if user is employee
    if (user.user_type === 'employee') {
      userProfile.dateOfBirth = user.date_of_birth;
      userProfile.gender = user.gender;
      userProfile.assignedBuilding = user.assigned_building;
      userProfile.assignedFloors = user.assigned_floors;
    }

    return NextResponse.json({
      message: 'Login successful',
      user: userProfile,
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}