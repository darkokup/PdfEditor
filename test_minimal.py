#!/usr/bin/env python3
"""
Simple test to create a minimal PDF file for testing
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

def create_test_pdf():
    """Create a simple test PDF"""
    filename = "minimal_test.pdf"
    
    # Create a new PDF
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Add some simple text
    c.drawString(100, height - 100, "Test PDF Document")
    c.drawString(100, height - 130, "This is a minimal test PDF for annotation testing.")
    c.drawString(100, height - 160, "If you can see this, the PDF loading is working correctly.")
    
    # Save the PDF
    c.save()
    print(f"Created {filename}")

if __name__ == "__main__":
    create_test_pdf()