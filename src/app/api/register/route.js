import { NextResponse } from 'next/server';

// Validation functions
const validateName = (name) => {
  if (!name || name.trim().length === 0) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters long";
  }
  if (name.trim().length > 50) {
    return "Name must be less than 50 characters";
  }
  return null;
};

const validatePhone = (phone) => {
  if (!phone || phone.trim().length === 0) {
    return "Phone number is required";
  }
  // Thai phone number validation (10 digits starting with 0)
  const phoneRegex = /^0[0-9]{9}$/;
  if (!phoneRegex.test(phone.replace(/\s|-/g, ''))) {
    return "Please enter a valid Thai phone number (10 digits starting with 0)";
  }
  return null;
};

const validateAddress = (address) => {
  if (!address || address.trim().length === 0) {
    return "Address is required";
  }
  if (address.trim().length < 10) {
    return "Address must be at least 10 characters long";
  }
  if (address.trim().length > 200) {
    return "Address must be less than 200 characters";
  }
  return null;
};

export async function POST(request) {
  try {
    const { name, phone, address, file } = await request.json();
    let fileInfo = null;

    // Validate all fields
    const errors = {};
    
    const nameError = validateName(name);
    if (nameError) errors.name = nameError;
    
    const phoneError = validatePhone(phone);
    if (phoneError) errors.phone = phoneError;
    
    const addressError = validateAddress(address);
    if (addressError) errors.address = addressError;

    // If there are validation errors, return them
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Validation failed", 
          errors 
        },
        { status: 400 }
      );
    }

    // Process file if provided
    if (file) {
      const timestamp = Date.now();
      const originalName = file.name;
      const extension = originalName.split('.').pop();
      const filename = `${timestamp}_${originalName}`;
      
      // Save file to uploads directory
      const uploadDir = join(process.cwd(), 'public', 'uploads');
      const filepath = join(uploadDir, filename);
      
      try {
        await writeFile(filepath, buffer);
        fileInfo = {
          originalName: originalName,
          filename: filename,
          size: file.size,
          type: file.type,
          url: `/uploads/${filename}`
        };
      } catch (fileError) {
        console.error('File upload error:', fileError);
        return NextResponse.json(
          { 
            success: false, 
            message: "File upload failed" 
          },
          { status: 500 }
        );
      }
    }

    // Prepare registration data
    const registrationData = {
      id: Date.now(),
      name: name.trim(),
      phone: phone.replace(/\s|-/g, ''),
      address: address.trim(),
      file: fileInfo,
      createdAt: new Date().toISOString()
    };

    // Log the registration data (in production, save to database)
    console.log('New registration:', registrationData);

    return NextResponse.json(
      { 
        success: true, 
        message: "Registration completed successfully!",
        data: registrationData
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Internal server error" 
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (optional - for testing)
export async function GET() {
  return NextResponse.json(
    { 
      message: "Registration API endpoint is working",
      methods: ["POST"]
    },
    { status: 200 }
  );
}
