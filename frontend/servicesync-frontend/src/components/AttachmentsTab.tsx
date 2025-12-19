// AttachmentsTab.tsx - File and image management for work orders
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  File,
  Paperclip,
  Camera,
  AlertCircle
} from 'lucide-react';

interface Attachment {
  id: number;
  work_order_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
}

interface AttachmentsTabProps {
  workOrderId: number;
  isReadOnly?: boolean;
}

const AttachmentsTab: React.FC<AttachmentsTabProps> = ({ workOrderId, isReadOnly = false }) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load attachments on mount
  useEffect(() => {
    loadAttachments();
  }, [workOrderId]);

  const loadAttachments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/work-orders/${workOrderId}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      } else if (response.status === 404) {
        // No attachments yet - that's okay
        setAttachments([]);
      } else {
        throw new Error('Failed to load attachments');
      }
    } catch (err: any) {
      console.error('Error loading attachments:', err);
      setError(err.message);
      // Don't show error for initial load if no attachments exist
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`http://localhost:5000/api/work-orders/${workOrderId}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Uploaded ${data.uploaded.length} file(s)`);
        await loadAttachments(); // Reload the list
      } else {
        throw new Error('Upload failed');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/work-orders/${workOrderId}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        console.log('✅ Attachment deleted');
        await loadAttachments();
      } else {
        throw new Error('Delete failed');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setError('Failed to delete attachment');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon size={20} color="#3B82F6" />;
    if (fileType.includes('pdf')) return <FileText size={20} color="#EF4444" />;
    return <File size={20} color="#6B7280" />;
  };

  const isImageFile = (fileType: string) => fileType.startsWith('image/');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload Area */}
      {!isReadOnly && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragActive ? '#3B82F6' : '#D1D5DB'}`,
            borderRadius: '0.75rem',
            padding: '3rem 2rem',
            textAlign: 'center',
            backgroundColor: dragActive ? '#EFF6FF' : '#F9FAFB',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => handleFileSelect(e.target.files)}
            style={{ display: 'none' }}
          />

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: dragActive ? '#3B82F6' : '#E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}>
              {uploading ? (
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  border: '3px solid white',
                  borderTop: '3px solid #3B82F6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                <Upload size={32} color={dragActive ? 'white' : '#6B7280'} />
              )}
            </div>

            <div>
              <p style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                Images, PDFs, Word docs, Excel files (Max 10MB each)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="#DC2626" />
          <span style={{ color: '#991B1B', fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {/* Attachments Grid */}
      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '3rem'
        }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            border: '3px solid #E5E7EB',
            borderTop: '3px solid #3B82F6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      ) : attachments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.75rem',
          border: '1px solid #E5E7EB'
        }}>
          <Paperclip size={48} color="#D1D5DB" style={{ margin: '0 auto 1rem' }} />
          <p style={{
            fontSize: '1rem',
            fontWeight: '500',
            color: '#6B7280',
            marginBottom: '0.5rem'
          }}>
            No attachments yet
          </p>
          <p style={{
            fontSize: '0.875rem',
            color: '#9CA3AF'
          }}>
            Upload photos, documents, or other files related to this work order
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '0.75rem',
                overflow: 'hidden',
                backgroundColor: 'white',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Thumbnail/Preview */}
              <div
                onClick={() => setPreviewFile(attachment)}
                style={{
                  height: '150px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden'
                }}
              >
                {isImageFile(attachment.file_type) ? (
                  <img
                    src={attachment.thumbnail_url || attachment.file_url}
                    alt={attachment.file_name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  getFileIcon(attachment.file_type)
                )}
              </div>

              {/* File Info */}
              <div style={{ padding: '0.75rem' }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '0.25rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }} title={attachment.file_name}>
                  {attachment.file_name}
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  marginBottom: '0.75rem'
                }}>
                  {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem'
                }}>
                  <button
                    onClick={() => setPreviewFile(attachment)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#EFF6FF',
                      color: '#3B82F6',
                      border: '1px solid #DBEAFE',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Eye size={14} />
                    View
                  </button>
                  <a
                    href={attachment.file_url}
                    download={attachment.file_name}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#F0FDF4',
                      color: '#10B981',
                      border: '1px solid #D1FAE5',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem',
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={14} />
                    Save
                  </a>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#FEF2F2',
                        color: '#EF4444',
                        border: '1px solid #FECACA',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem'
          }}
        >
          <button
            onClick={() => setPreviewFile(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <X size={20} />
            Close
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              overflow: 'hidden'
            }}
          >
            {isImageFile(previewFile.file_type) ? (
              <img
                src={previewFile.file_url}
                alt={previewFile.file_name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                padding: '3rem',
                textAlign: 'center'
              }}>
                {getFileIcon(previewFile.file_type)}
                <p style={{
                  marginTop: '1rem',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  {previewFile.file_name}
                </p>
                <a
                  href={previewFile.file_url}
                  download={previewFile.file_name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  <Download size={16} />
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AttachmentsTab;
