#!/usr/bin/env python3
"""
Test script to verify PDF upload to backend works
"""

import requests

def test_pdf_upload():
    """Test uploading a PDF to the backend"""
    
    # Test with the file upload endpoint
    try:
        url = 'http://localhost:5001/api/upload-pdf'
        
        # Open the PDF file and upload it
        with open('test.pdf', 'rb') as f:
            files = {'file': ('test.pdf', f, 'application/pdf')}
            response = requests.post(url, files=files)
        
        if response.status_code == 200:
            result = response.json()
            print("✓ PDF upload successful!")
            print(f"  Success: {result.get('success')}")
            print(f"  Message: {result.get('message')}")
            print(f"  Filename: {result.get('filename')}")
            print(f"  Pages: {result.get('num_pages')}")
            if 'pdf_data' in result:
                print(f"  PDF data length: {len(result['pdf_data'])}")
            return True
        else:
            print(f"✗ Upload failed with status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error during upload test: {e}")
        return False

if __name__ == "__main__":
    test_pdf_upload()