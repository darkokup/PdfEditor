from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# Create a simple test PDF
c = canvas.Canvas("test.pdf", pagesize=letter)
width, height = letter

# Add some text to the PDF
c.drawString(100, height - 100, "This is a test PDF for annotation testing")
c.drawString(100, height - 150, "Upload this file to test the PDF annotation application")
c.drawString(100, height - 200, "Click anywhere on this page to add annotations")

# Save the PDF
c.save()
print("Test PDF created: test.pdf")