import requests
import json
import base64

# Read the test PDF
with open('F:/CodeTests/gittest/test.pdf', 'rb') as f:
    pdf_data = base64.b64encode(f.read()).decode('utf-8')

# Create test annotations
test_annotations = [
    {
        "id": "test1",
        "type": "text",
        "x": 100,
        "y": 100,
        "width": 120,
        "height": 30,
        "page": 1,
        "value": "Test Annotation",
        "created_at": "2025-09-20T10:00:00Z"
    }
]

# Test data
test_data = {
    "pdf_data": pdf_data,
    "annotations": test_annotations
}

print("Testing PDF generation endpoint...")
print(f"PDF data length: {len(pdf_data)} characters")
print(f"Number of annotations: {len(test_annotations)}")
print(f"Test annotation: {test_annotations[0]}")

try:
    response = requests.post(
        'http://localhost:5001/api/generate-pdf',
        json=test_data,
        headers={'Content-Type': 'application/json'}
    )
    
    print(f"Response status: {response.status_code}")
    
    if response.status_code == 200:
        # Save the response as a PDF file
        with open('F:/CodeTests/gittest/test_annotated.pdf', 'wb') as f:
            f.write(response.content)
        print("✅ PDF generated successfully and saved as test_annotated.pdf")
    else:
        print(f"❌ Error: {response.text}")
        
except Exception as e:
    print(f"❌ Exception: {e}")