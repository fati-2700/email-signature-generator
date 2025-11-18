'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface SignatureData {
  fullName: string;
  jobTitle: string;
  company: string;
  phone: string;
  email: string;
  website: string;
  photo: string | null;
  companyLogo: string | null;
  linkedin: string;
  twitter: string;
  instagram: string;
  isPro: boolean;
}

export default function Generator() {
  const [data, setData] = useState<SignatureData>({
    fullName: '',
    jobTitle: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    photo: null,
    companyLogo: null,
    linkedin: '',
    twitter: '',
    instagram: '',
    isPro: false,
  });

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState({ type: 'success', title: '', description: '' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Check payment status from localStorage on mount
  useEffect(() => {
    const hasPaid = typeof window !== 'undefined' ? localStorage.getItem('signatureflow_paid') === 'true' : false;
    if (hasPaid) {
      setData((prev) => ({ ...prev, isPro: true }));
    }

    // Verificar si el usuario regresó de un pago exitoso
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      
      if (paymentStatus === 'success') {
        // Limpiar el parámetro de la URL
        window.history.replaceState({}, '', window.location.pathname);
        
        // Verificar y activar el pago
        if (!hasPaid) {
          verifyPayment();
        }
      }
    }
  }, []);

  // Function to check if user has paid
  const hasUserPaid = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('signatureflow_paid') === 'true' : false;
  };

  // Function to mark payment as complete (for manual verification in MVP)
  const verifyPayment = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('signatureflow_paid', 'true');
    }
    setData((prev) => ({ ...prev, isPro: true }));
    setToastMessage({
      type: 'success',
      title: 'Payment Verified!',
      description: 'Watermark removed. You can now generate signatures without watermark.'
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Expose verifyPayment to window for manual verification (MVP)
  useEffect(() => {
    (window as any).verifyPayment = verifyPayment;
    return () => {
      delete (window as any).verifyPayment;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: keyof SignatureData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // Compress image to reduce base64 size
  const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (field: 'photo' | 'companyLogo', file: File | null) => {
    if (!file) {
      setData((prev) => ({ ...prev, [field]: null }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToastMessage({
        type: 'error',
        title: 'Invalid File',
        description: 'Please select an image file'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setToastMessage({
        type: 'error',
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    // Set loading state
    if (field === 'photo') {
      setUploadingPhoto(true);
    } else {
      setUploadingLogo(true);
    }

    try {
      // Compress images: photo (200x200) and logo (400x200)
      const maxDimensions = field === 'photo' 
        ? { width: 200, height: 200 } 
        : { width: 400, height: 200 };
      
      const base64 = await compressImage(file, maxDimensions.width, maxDimensions.height, 0.85);
      setData((prev) => ({ ...prev, [field]: base64 }));
      
      setToastMessage({
        type: 'success',
        title: 'Success!',
        description: `${field === 'photo' ? 'Photo' : 'Logo'} uploaded successfully`
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error processing image:', error);
      setToastMessage({
        type: 'error',
        title: 'Upload Failed',
        description: 'Failed to process image. Please try again.'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      if (field === 'photo') {
        setUploadingPhoto(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const copyHTML = () => {
    if (!previewRef.current) return;

    // Generate email-compatible HTML
    const generateSignatureHTML = () => {
      const photoHtml = data.photo
        ? `<img src="${data.photo}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #e5e7eb;" />`
        : `<div style="width: 80px; height: 80px; border-radius: 50%; background-color: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px; font-weight: bold;">${data.fullName ? data.fullName.charAt(0).toUpperCase() : '?'}</div>`;

      const companyLogoHtml = data.companyLogo
        ? `<img src="${data.companyLogo}" alt="Company Logo" style="max-height: 30px; margin-top: 8px; margin-bottom: 8px;" />`
        : '';

      const socialIconsHtml = [];
      if (data.linkedin) {
        socialIconsHtml.push(
          `<a href="${data.linkedin}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-right: 12px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#0077b5" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>`
        );
      }
      if (data.twitter) {
        socialIconsHtml.push(
          `<a href="${data.twitter}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-right: 12px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#1da1f2" xmlns="http://www.w3.org/2000/svg"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></a>`
        );
      }
      if (data.instagram) {
        socialIconsHtml.push(
          `<a href="${data.instagram}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-right: 12px;"><svg width="20" height="20" viewBox="0 0 24 24" fill="#e4405f" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></a>`
        );
      }

      const socialSectionHtml = socialIconsHtml.length > 0
        ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">${socialIconsHtml.join('')}</div>`
        : '';

      // Check localStorage for payment status (in case state is out of sync)
      const isProUser = data.isPro || hasUserPaid();
      const watermarkHtml = !isProUser
        ? `<tr><td colspan="2" style="padding-top: 12px; border-top: 1px solid #e5e7eb; text-align: center;"><div style="font-size: 11px; color: #9ca3af; font-style: italic;">Made with SignatureFlow</div></td></tr>`
        : '';

      return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333333; max-width: 600px;">
  <tr>
    <td style="vertical-align: top; padding-right: 20px;">
      ${photoHtml}
    </td>
    <td style="vertical-align: top;">
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 16px; color: #111827; display: block; margin-bottom: 4px;">${data.fullName || 'Your Name'}</strong>
        ${data.jobTitle ? `<div style="color: #6b7280; font-size: 13px; margin-bottom: 2px;">${data.jobTitle}</div>` : ''}
        ${data.company ? `<div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">${data.company}</div>` : ''}
        ${companyLogoHtml}
      </div>
      <div style="font-size: 13px; color: #4b5563; line-height: 1.8;">
        ${data.phone ? `<div><strong>Phone:</strong> ${data.phone}</div>` : ''}
        ${data.email ? `<div><strong>Email:</strong> <a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a></div>` : ''}
        ${data.website ? `<div><strong>Website:</strong> <a href="${data.website}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none;">${data.website.replace(/^https?:\/\//, '')}</a></div>` : ''}
      </div>
      ${socialSectionHtml}
    </td>
  </tr>
  ${watermarkHtml}
</table>`;
    };

    const fullHTML = generateSignatureHTML();

    navigator.clipboard.writeText(fullHTML).then(() => {
      setToastMessage({
        type: 'success',
        title: 'Success!',
        description: 'HTML signature copied to clipboard'
      });
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
      setToastMessage({
        type: 'error',
        title: 'Error',
        description: 'Failed to copy to clipboard'
      });
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    });
  };

  const downloadAsImage = async () => {
    if (!previewRef.current) return;

    setIsDownloading(true);

    try {
      // Dynamic import for html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      // Get the preview element (the inner white box, not the gray container)
      const previewElement = previewRef.current;
      
      const canvas = await html2canvas(previewElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        width: previewElement.offsetWidth,
        height: previewElement.offsetHeight,
        windowWidth: previewElement.scrollWidth,
        windowHeight: previewElement.scrollHeight,
      });

      // Convert canvas to blob for better quality
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create image blob');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `email-signature-${Date.now()}.png`;
        link.href = url;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(url);
        
        setIsDownloading(false);
        
        // Show success toast
        setToastMessage({
          type: 'success',
          title: 'Success!',
          description: 'Signature downloaded as PNG image'
        });
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 3000);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error generating image:', error);
      setIsDownloading(false);
      
      setToastMessage({
        type: 'error',
        title: 'Error',
        description: 'Failed to generate image. Please try again.'
      });
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    }
  };

  const removeWatermark = async () => {
    // Check if already paid
    if (hasUserPaid()) {
      setData((prev) => ({ ...prev, isPro: true }));
      return;
    }

    try {
      // Crear sesión de checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      
      if (url) {
        // Redirigir a Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
      setToastMessage({
        type: 'error',
        title: 'Payment Error',
        description: 'Failed to initiate payment. Please try again.'
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Email Signature Generator</h1>
          <p className="text-gray-600">Create professional email signatures in seconds</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Panel - Form */}
          <div className="bg-white rounded-xl shadow-lg p-6 h-fit">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Personal Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={data.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={data.jobTitle}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Senior Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={data.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Acme Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={data.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo (Optional)
                </label>
                {data.photo ? (
                  <div className="mb-3">
                    <div className="relative inline-block">
                      <img
                        src={data.photo}
                        alt="Profile preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData((prev) => ({ ...prev, photo: null }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                        title="Remove photo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Click remove to change photo</p>
                  </div>
                ) : null}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('photo', e.target.files?.[0] || null)}
                    disabled={uploadingPhoto}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingPhoto && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Will be compressed and converted to base64.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo (Optional)
                </label>
                {data.companyLogo ? (
                  <div className="mb-3">
                    <div className="relative inline-block">
                      <img
                        src={data.companyLogo}
                        alt="Logo preview"
                        className="max-h-16 max-w-48 object-contain border-2 border-gray-300 rounded p-2 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setData((prev) => ({ ...prev, companyLogo: null }));
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                        title="Remove logo"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Click remove to change logo</p>
                  </div>
                ) : null}
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload('companyLogo', e.target.files?.[0] || null)}
                    disabled={uploadingLogo}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  {uploadingLogo && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Max 5MB. Will be compressed and converted to base64.</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Links (Optional)</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={data.linkedin}
                      onChange={(e) => handleInputChange('linkedin', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="https://linkedin.com/in/johndoe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Twitter
                    </label>
                    <input
                      type="url"
                      value={data.twitter}
                      onChange={(e) => handleInputChange('twitter', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="https://twitter.com/johndoe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instagram
                    </label>
                    <input
                      type="url"
                      value={data.instagram}
                      onChange={(e) => handleInputChange('instagram', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                      placeholder="https://instagram.com/johndoe"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Live Preview */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Live Preview</h2>
            
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-200">
              <div
                ref={previewRef}
                className="bg-white rounded-lg p-6 shadow-sm"
                style={{ maxWidth: '600px', margin: '0 auto' }}
              >
                <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontSize: '14px', lineHeight: '1.6', color: '#333333' }}>
                  <tr>
                    <td style={{ verticalAlign: 'top', paddingRight: '20px' }}>
                      {data.photo ? (
                        <img
                          src={data.photo}
                          alt="Profile"
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #e5e7eb',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            fontSize: '24px',
                            fontWeight: 'bold',
                          }}
                        >
                          {data.fullName ? data.fullName.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px', color: '#111827', display: 'block', marginBottom: '4px' }}>
                          {data.fullName || 'Your Name'}
                        </strong>
                        {data.jobTitle && (
                          <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '2px' }}>
                            {data.jobTitle}
                          </div>
                        )}
                        {data.company && (
                          <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '8px' }}>
                            {data.company}
                          </div>
                        )}
                        {data.companyLogo && (
                          <img
                            src={data.companyLogo}
                            alt="Company Logo"
                            style={{ maxHeight: '30px', marginTop: '8px', marginBottom: '8px' }}
                          />
                        )}
                      </div>
                      
                      <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.8' }}>
                        {data.phone && (
                          <div>
                            <strong>Phone:</strong> {data.phone}
                          </div>
                        )}
                        {data.email && (
                          <div>
                            <strong>Email:</strong>{' '}
                            <a href={`mailto:${data.email}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                              {data.email}
                            </a>
                          </div>
                        )}
                        {data.website && (
                          <div>
                            <strong>Website:</strong>{' '}
                            <a href={data.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                              {data.website.replace(/^https?:\/\//, '')}
                            </a>
                          </div>
                        )}
                      </div>

                      {(data.linkedin || data.twitter || data.instagram) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            {data.linkedin && (
                              <a href={data.linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077b5" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                                </svg>
                              </a>
                            )}
                            {data.twitter && (
                              <a href={data.twitter} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1da1f2" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                                </svg>
                              </a>
                            )}
                            {data.instagram && (
                              <a href={data.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#e4405f" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                  {!hasUserPaid() && (
                    <tr>
                      <td colSpan={2} style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                          Made with SignatureFlow
                        </div>
                      </td>
                    </tr>
                  )}
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4">
              <button
                onClick={copyHTML}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                Copy HTML
              </button>
              
              <button
                onClick={downloadAsImage}
                disabled={isDownloading}
                className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Download as Image'
                )}
              </button>
            </div>

            {!hasUserPaid() && (
              <button
                onClick={removeWatermark}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
              >
                Remove Watermark - €9
              </button>
            )}
          </div>

          {!hasUserPaid() && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Made with <span className="font-semibold text-gray-700">SignatureFlow</span>
              </p>
            </div>
          )}

          {/* MVP Manual Verification - Remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 mb-2">
                <strong>MVP Manual Verification:</strong> After payment, call <code className="bg-yellow-100 px-1 rounded">verifyPayment()</code> in browser console to activate pro features.
              </p>
              <button
                onClick={verifyPayment}
                className="text-xs px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Verify Payment (Dev Only)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div className={`${
            toastMessage.type === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          } px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 min-w-[280px]`}>
            {toastMessage.type === 'success' ? (
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            <div>
              <p className="font-semibold">{toastMessage.title}</p>
              <p className={`text-sm ${
                toastMessage.type === 'success' 
                  ? 'text-green-100' 
                  : 'text-red-100'
              }`}>
                {toastMessage.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

