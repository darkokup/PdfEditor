import React from 'react';

interface SimplePDFDisplayProps {
  pdfData: string | null;
  filename: string;
}

const SimplePDFDisplay: React.FC<SimplePDFDisplayProps> = ({ pdfData, filename }) => {
  const testConnection = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/health');
      const data = await response.json();
      alert(`Connection test successful: ${data.message}`);
    } catch (error: any) {
      alert(`Connection test failed: ${error.message}`);
    }
  };

  if (!pdfData) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', border: '2px dashed #ccc' }}>
        <h3>No PDF loaded</h3>
        <p>Upload a PDF file to get started</p>
        <button 
          onClick={testConnection}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Backend Connection
        </button>
      </div>
    );
  }

  const pdfUrl = `data:application/pdf;base64,${pdfData}`;

  return (
    <div style={{ padding: '20px' }}>
      <h3>PDF Loaded Successfully: {filename}</h3>
      <p>PDF data received and processed!</p>
      <div style={{ marginTop: '20px' }}>
        <a 
          href={pdfUrl} 
          download={filename}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            marginRight: '10px'
          }}
        >
          Download PDF
        </a>
        <a 
          href={pdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}
        >
          Open PDF in New Tab
        </a>
      </div>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <p><strong>Status:</strong> PDF upload and processing working correctly!</p>
        <p><strong>Next:</strong> The PDF viewer will be added once the worker issue is resolved.</p>
      </div>
    </div>
  );
};

export default SimplePDFDisplay;