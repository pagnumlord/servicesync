// FileRoom.tsx - Photo and document management for work orders
import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image,
  FileText,
  Receipt,
  Tag,
  X,
  Download,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  File
} from 'lucide-react';

interface FileAttachment {
  id: number;
  work_order_id: number;
  file_name: string;
  file_type: string;
  file_size: number;
  file_category: string;
  file_path: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;
  notes?: string;
}

interface FileRoomProps {
  workOrderId: number;
  workOrderNumber: string;
  userId: number;
  isReadOnly?: boolean;
}

const FileRoom: React.FC<FileRoomProps> = ({
  workOrderId,
  workOrderNumber,
  userId,
  isReadOnly = false
}) => {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('photo');
  const [uploadNotes, setUploadNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'data_tag', label: 'Data Tag', icon: Tag, color: '#3B82F6' },
    { id: 'receipt', label: 'Receipt', icon: Receipt, color: '#10B981' },
    { id: 'photo', label: 'Photo', icon: Image, color: '#F59E0B' },
    { id: 'document', label: 'Document', icon: FileText, color: '#8B5CF6' },
    { id: 'other', label: 'Other', icon: File, color: '#6B7280' }
  ];

  useEffect(() => {
    loadFiles();
  }, [workOrderId]);

  const loadFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/work-orders/${workOrderId}/files`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        throw new Error('Failed to load files');
      }
    } catch (err: any) {
      console.error('File load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('work_order_id', workOrderId.toString());
        formData.append('file_category', uploadCategory);
        formData.append('uploaded_by', userId.toString());
        if (uploadNotes.trim()) {
          formData.append('notes', uploadNotes.trim());
        }

        const response = await fetch('http://localhost:5000/api/files/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      setSuccess(`${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`);
      setUploadNotes('');
      await loadFiles();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileId: number, fileName: string) => {
    if (!confirm(`Delete ${fileName}?`)) return;

    try {
      const response = await fetch(`http://localhost:5000/api/files/${fileId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSuccess('File deleted successfully');
        await loadFiles();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error('Failed to delete file');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message);
    }
  };

  const handleDownload = (file: FileAttachment) => {
    window.open(`http://localhost:5000${file.file_path}`, '_blank');
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    if (!cat) return File;
    return cat.icon;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat?.color || '#6B7280';
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const filteredFiles = selectedCategory === 'all'
    ? files
    : files.filter(f => f.file_category === selectedCategory);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '0.25rem'
            }}>
              File Room
            </h3>
            <p style={{
              fontSize: '0.75rem',
              color: '#6B7280'
            }}>
              WO #{workOrderNumber} • {files.length} file{files.length !== 1 ? 's' : ''}
            </p>
          </div>

          {!isReadOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: '0.625rem 1rem',
                backgroundColor: uploading ? '#9CA3AF' : '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </button>
          )}
        </div>

        {/* Upload Controls */}
        {!isReadOnly && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '200px 1fr',
            gap: '0.75rem',
            padding: '0.75rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '0.5rem'
          }}>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              disabled={uploading}
              style={{
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Optional notes..."
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              disabled={uploading}
              style={{
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          margin: '1rem',
          padding: '0.75rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#991B1B'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div style={{
          margin: '1rem',
          padding: '0.75rem',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#047857'
        }}>
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Category Filter */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #E5E7EB',
        backgroundColor: 'white',
        display: 'flex',
        gap: '0.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setSelectedCategory('all')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: selectedCategory === 'all' ? '#EFF6FF' : 'white',
            color: selectedCategory === 'all' ? '#1E40AF' : '#6B7280',
            border: `1px solid ${selectedCategory === 'all' ? '#3B82F6' : '#E5E7EB'}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          All ({files.length})
        </button>
        {categories.map(cat => {
          const count = files.filter(f => f.file_category === cat.id).length;
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: selectedCategory === cat.id ? cat.color + '10' : 'white',
                color: selectedCategory === cat.id ? cat.color : '#6B7280',
                border: `1px solid ${selectedCategory === cat.id ? cat.color : '#E5E7EB'}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} />
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Files Grid */}
      <div style={{
        flex: 1,
        padding: '1rem',
        backgroundColor: '#F9FAFB',
        overflowY: 'auto'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px'
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
        ) : filteredFiles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: '#9CA3AF'
          }}>
            <Upload size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              No files found
            </p>
            <p style={{ fontSize: '0.875rem' }}>
              {selectedCategory === 'all'
                ? 'Upload files to get started'
                : `No ${categories.find(c => c.id === selectedCategory)?.label.toLowerCase()} files`
              }
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {filteredFiles.map(file => {
              const Icon = getCategoryIcon(file.file_category);
              const isImage = isImageFile(file.file_name);

              return (
                <div
                  key={file.id}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => setPreviewFile(file)}
                    style={{
                      height: '150px',
                      backgroundColor: '#F3F4F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isImage ? (
                      <img
                        src={`http://localhost:5000${file.file_path}`}
                        alt={file.file_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <Icon size={48} color={getCategoryColor(file.file_category)} />
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: getCategoryColor(file.file_category),
                      color: 'white',
                      borderRadius: '0.25rem',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {categories.find(c => c.id === file.file_category)?.label}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.file_name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginBottom: '0.5rem'
                    }}>
                      {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                    </div>
                    {file.notes && (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#4B5563',
                        fontStyle: 'italic',
                        marginBottom: '0.5rem',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {file.notes}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginTop: '0.5rem'
                    }}>
                      <button
                        onClick={() => handleDownload(file)}
                        style={{
                          flex: 1,
                          padding: '0.375rem',
                          backgroundColor: '#F3F4F6',
                          color: '#374151',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Download size={12} />
                        Download
                      </button>
                      {!isReadOnly && (
                        <button
                          onClick={() => handleDelete(file.id, file.file_name)}
                          style={{
                            padding: '0.375rem',
                            backgroundColor: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <button
            onClick={() => setPreviewFile(null)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              padding: '0.75rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {isImageFile(previewFile.file_name) ? (
              <img
                src={`http://localhost:5000${previewFile.file_path}`}
                alt={previewFile.file_name}
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(90vh - 100px)',
                  objectFit: 'contain',
                  borderRadius: '0.5rem'
                }}
              />
            ) : (
              <div style={{
                padding: '3rem',
                backgroundColor: 'white',
                borderRadius: '1rem',
                textAlign: 'center'
              }}>
                <File size={64} color="#6B7280" style={{ margin: '0 auto 1rem' }} />
                <p style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '0.5rem'
                }}>
                  {previewFile.file_name}
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6B7280',
                  marginBottom: '1.5rem'
                }}>
                  Preview not available for this file type
                </p>
                <button
                  onClick={() => handleDownload(previewFile)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Download size={16} />
                  Download File
                </button>
              </div>
            )}

            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '0.5rem',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                {previewFile.file_name}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {formatFileSize(previewFile.file_size)} • Uploaded {formatDate(previewFile.uploaded_at)}
              </div>
              {previewFile.notes && (
                <div style={{
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  marginTop: '0.5rem',
                  opacity: 0.9
                }}>
                  {previewFile.notes}
                </div>
              )}
            </div>
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

export default FileRoom;
