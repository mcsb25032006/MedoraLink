'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [storedData, setStoredData] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataRetrieved, setDataRetrieved] = useState(false);

  // Function to send data to backend
  const sendData = async () => {
    if (!inputText.trim()) {
      setMessage('Please enter some text');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage('Data sent successfully! Backend has received your data.');
        setInputText(''); // Clear input
        setDataRetrieved(false); // Hide data until user clicks retrieve
      } else {
        setMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setMessage('Failed to send data');
    } finally {
      setLoading(false);
    }
  };

  // Function to retrieve data from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      
      if (response.ok) {
        setStoredData(result.data);
        setMessage(`Retrieved ${result.count} items`);
        setDataRetrieved(true); // Show data after successful retrieval
      } else {
        setMessage('Failed to retrieve data');
      }
    } catch (error) {
      setMessage('Failed to retrieve data');
    } finally {
      setLoading(false);
    }
  };

  // Function to delete an item
  const deleteItem = async (id) => {
    try {
      const response = await fetch(`/api/data/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage('Item deleted successfully');
        fetchData(); // Refresh the list
        setDataRetrieved(true); // Keep data visible after deletion
      } else {
        setMessage('Failed to delete item');
      }
    } catch (error) {
      setMessage('Failed to delete item');
    }
  };

  // Function to clear all data
  const clearAllData = async () => {
    try {
      const response = await fetch('/api/clear', {
        method: 'POST',
      });

      if (response.ok) {
        setMessage('All data cleared');
        setStoredData([]);
        setDataRetrieved(false); // Hide data display after clearing
      } else {
        setMessage('Failed to clear data');
      }
    } catch (error) {
      setMessage('Failed to clear data');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>CRUD App - Frontend & Backend</h1>
      
      {/* Input Section */}
      <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Add New Data</h2>
        <div style={{ marginBottom: '10px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter your text here..."
            style={{ 
              width: '100%', 
              padding: '10px', 
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendData()}
          />
        </div>
        <button
          onClick={sendData}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Sending...' : 'Send Data'}
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '10px'
          }}
        >
          {loading ? 'Loading...' : 'Retrieve Data'}
        </button>
        
        <button
          onClick={clearAllData}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear All Data
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div style={{
          padding: '10px',
          backgroundColor: message.includes('Error') || message.includes('Failed') ? '#f8d7da' : '#d4edda',
          color: message.includes('Error') || message.includes('Failed') ? '#721c24' : '#155724',
          border: '1px solid',
          borderColor: message.includes('Error') || message.includes('Failed') ? '#f5c6cb' : '#c3e6cb',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {message}
        </div>
      )}

      {/* Data Display - Only show if data has been retrieved */}
      {dataRetrieved && (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Stored Data ({storedData.length} items)</h2>
          {storedData.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No data stored yet. Add some data above!</p>
          ) : (
            <div>
              {storedData.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '10px',
                    margin: '10px 0',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong>ID: {item.id}</strong> - {item.text}
                    <br />
                    <small style={{ color: '#666' }}>
                      Added: {new Date(item.timestamp).toLocaleString()}
                    </small>
                  </div>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
