import React, { useEffect, useState } from 'react';

function MyFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Not authenticated');
        }
        console.log('Fetching files with token:', token); // Debug log
        const response = await fetch('/api/files', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
          credentials: 'include',
        });
        console.log('Response status:', response.status); // Debug log
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch files');
        }
        const data = await response.json();
        console.log('Fetched files:', data); // Debug log
        if (Array.isArray(data)) {
          setFiles(data);
        } else {
          console.error('Received non-array data:', data);
          setError('Invalid data format received from server');
        }
      } catch (err) {
        console.error('Error fetching files:', err); // Debug log
        setError(err.message || 'Error fetching files');
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const handleDownload = async (fileId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to download files');
      return;
    }
    try {
      console.log('Downloading file:', fileId); // Debug log
      const response = await fetch(`/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const file = files.find(f => f._id === fileId || f.id === fileId);
      a.download = file ? file.originalname : 'downloaded-file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err); // Debug log
      alert(err.message || 'Error downloading file');
    }
  };

  const getImageUrl = (fileId) => {
    const token = localStorage.getItem('token');
    if (!token) return '';
    return `/api/files/${fileId}`;
  };

  const handleImageLoad = async (fileId, e) => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token available for image load');
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
      return;
    }

    try {
      console.log('Loading image for file:', fileId); // Debug log
      const response = await fetch(`/api/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load image');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      console.log('Created blob URL:', url); // Debug log
      e.target.src = url;
    } catch (error) {
      console.error('Error loading image:', error);
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  const isImageFile = (mimetype) => {
    return mimetype && mimetype.startsWith('image/');
  };

  const getFileIcon = (mimetype) => {
    if (!mimetype) return '📁';
    if (isImageFile(mimetype)) return '🖼️';
    if (mimetype.includes('pdf')) return '📄';
    if (mimetype.includes('word')) return '📝';
    if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
    if (mimetype.includes('video')) return '🎥';
    if (mimetype.includes('audio')) return '🎵';
    return '📁';
  };

  // Debug log for files state
  useEffect(() => {
    console.log('Current files state:', files);
  }, [files]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>My Files</h2>
      {loading && <p>Loading files...</p>}
      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '10px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          borderRadius: '4px',
          border: '1px solid #ffcdd2',
        }}>
          {error}
        </div>
      )}
      {!loading && files.length === 0 && (
        <div style={{
          color: '#666',
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          No files uploaded yet.
        </div>
      )}
      {!loading && files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {files.map(file => {
            const fileId = file._id;
            console.log('Rendering file:', file); // Debug log
            return (
              <div key={fileId} style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.07)'
              }}>
                {isImageFile(file.mimetype) ? (
                  <div style={{ marginBottom: '10px' }}>
                    <img 
                      src={getImageUrl(fileId)}
                      alt={file.originalname}
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        background: '#f0f0f0',
                      }}
                      onLoad={(e) => handleImageLoad(fileId, e)}
                      onError={(e) => {
                        console.error('Image load error for file:', fileId); // Debug log
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlZWUiLz48dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIEVycm9yPC90ZXh0Pjwvc3ZnPg==';
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    fontSize: '48px', 
                    textAlign: 'center', 
                    marginBottom: '10px',
                    color: '#666'
                  }}>
                    {getFileIcon(file.mimetype)}
                  </div>
                )}
                <div style={{ marginBottom: '10px' }}>
                  <p style={{ 
                    margin: '0 0 5px 0', 
                    fontSize: '14px',
                    fontWeight: 'bold',
                    color: '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                    title={file.originalname}
                  >
                    {file.originalname}
                  </p>
                  <p style={{ 
                    margin: '0', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <p style={{ 
                    margin: '5px 0 0 0', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    {new Date(file.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(fileId)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginBottom: isImageFile(file.mimetype) ? '8px' : 0
                  }}
                >
                  {isImageFile(file.mimetype) ? 'View Full Size' : 'Download'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyFiles; 