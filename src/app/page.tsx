"use client";
import { useState } from "react";

export default function Home() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  interface FormData {
    name: string;
    phone: string;
    address: string;
  }

  interface FormErrors {
    [key: string]: string;
  }

  const validateFile = (file: File): string | null => {
    // File size validation (180MB max for chunked upload)
    const maxSize = 180 * 1024 * 1024; // 180MB in bytes
    if (file.size > maxSize) {
      return "File size must be less than 180MB";
    }

    // File type validation
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'video/mp4',
      'video/avi',
      'video/mov',
      'application/zip',
      'application/x-rar-compressed'
    ];
    if (!allowedTypes.includes(file.type)) {
      return "Please upload only image files (JPG, PNG, GIF), documents (PDF, DOC, DOCX), videos (MP4, AVI, MOV), or archives (ZIP, RAR)";
    }

    return null;
  };

  const uploadFileInChunks = async (file: File): Promise<string> => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const chunkFormData = new FormData();
        chunkFormData.append('chunk', chunk);
        chunkFormData.append('chunkIndex', chunkIndex.toString());
        chunkFormData.append('totalChunks', totalChunks.toString());
        chunkFormData.append('fileId', fileId);
        chunkFormData.append('fileName', file.name);
        chunkFormData.append('fileSize', file.size.toString());

        const response = await fetch('/api/upload-chunk', {
          method: 'POST',
          body: chunkFormData,
        });

        if (!response.ok) {
          throw new Error('Chunk upload failed');
        }

        // Update progress
        const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        setUploadProgress(progress);
      }

      // Finalize the upload
      const finalizeResponse = await fetch('/api/finalize-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          fileName: file.name,
          totalChunks,
          fileSize: file.size,
          fileType: file.type
        }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('File finalization failed');
      }

      const result = await finalizeResponse.json();
      return result.filePath;

    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ""
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    
    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        setErrors({
          ...errors,
          file: fileError
        });
        setFile(null);
        e.target.value = ""; // Clear the input
      } else {
        setFile(selectedFile);
        // Clear file error if validation passes
        if (errors.file) {
          setErrors({
            ...errors,
            file: ""
          });
        }
      }
    } else {
      setFile(null);
      if (errors.file) {
        setErrors({
          ...errors,
          file: ""
        });
      }
    }
  };

  const handleSubmit = async (e : React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setMessage("");

    try {
      let filePath = null;

      // Upload file in chunks if file exists and is large
      if (file) {
        if (file.size > 5 * 1024 * 1024) { // Files larger than 5MB use chunked upload
          filePath = await uploadFileInChunks(file);
        } else {
          // Use regular upload for small files
          const fileFormData = new FormData();
          fileFormData.append('file', file);
          
          const fileResponse = await fetch('/api/upload-file', {
            method: 'POST',
            body: fileFormData,
          });

          if (fileResponse.ok) {
            const fileResult = await fileResponse.json();
            filePath = fileResult.filePath;
          }
        }
      }

      // Submit registration data
      const registrationData = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        filePath: filePath
      };

      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("Registration successful!");
        setFormData({ name: "", phone: "", address: "" });
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById('file') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        if (result.errors) {
          setErrors(result.errors);
        } else {
          setMessage(result.message || "Registration failed");
        }
      }
    } catch (error) {
      setMessage("Network error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
          Register
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phone ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.address ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Enter your address"
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
              Attach File (Optional)
            </label>
            <input
              type="file"
              id="file"
              name="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.mp4,.avi,.mov,.zip,.rar"
              disabled={isUploading}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 ${
                errors.file ? "border-red-500" : "border-gray-300"
              }`}
            />
            {file && (
              <div className="mt-1 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                {file.size > 5 * 1024 * 1024 && (
                  <span className="text-blue-600 ml-2">(Will use chunked upload)</span>
                )}
              </div>
            )}
            
            {/* Progress Bar */}
            {isUploading && (
              <div className="mt-2">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {errors.file && <p className="text-red-500 text-sm mt-1">{errors.file}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Max size: 180MB per file, maximum 6 files. Allowed: Images, Documents, Videos, Archives. Large files will be uploaded in chunks.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition-colors"
          >
            {isUploading ? "Uploading File..." : isSubmitting ? "Registering..." : "Register"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.includes("successful") 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
