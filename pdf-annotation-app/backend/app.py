from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import pickle
import base64
from io import BytesIO
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, toColor
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'], 
     allow_headers=['Content-Type'], 
     methods=['GET', 'POST', 'OPTIONS'])

# Configure upload folder
UPLOAD_FOLDER = '../projects'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def parse_color(color_str):
    """Convert CSS color to reportlab color"""
    if not color_str:
        return "black"
    
    # Handle named colors
    color_map = {
        'red': HexColor('#FF0000'),
        'blue': HexColor('#0000FF'),
        'green': HexColor('#008000'),
        'black': HexColor('#000000'),
        'white': HexColor('#FFFFFF'),
        'yellow': HexColor('#FFFF00'),
        'orange': HexColor('#FFA500'),
        'purple': HexColor('#800080'),
        'gray': HexColor('#808080'),
        'grey': HexColor('#808080'),
        'brown': HexColor('#A52A2A'),
        'pink': HexColor('#FFC0CB'),
        'cyan': HexColor('#00FFFF'),
        'magenta': HexColor('#FF00FF'),
        'lime': HexColor('#00FF00'),
        'navy': HexColor('#000080'),
        'maroon': HexColor('#800000'),
        'olive': HexColor('#808000'),
        'teal': HexColor('#008080'),
        'silver': HexColor('#C0C0C0')
    }
    
    color_str = color_str.lower().strip()
    
    if color_str in color_map:
        return color_map[color_str]
    
    # Handle hex colors
    if color_str.startswith('#'):
        try:
            return HexColor(color_str)
        except:
            return "black"
    
    # Handle rgb() format
    if color_str.startswith('rgb('):
        try:
            # Extract numbers from rgb(r,g,b)
            rgb_part = color_str[4:-1]  # Remove 'rgb(' and ')'
            r, g, b = [int(x.strip()) for x in rgb_part.split(',')]
            hex_color = '#%02x%02x%02x' % (r, g, b)
            return HexColor(hex_color)
        except:
            return "black"
    
    # Default fallback
    return "black"

def parse_border_style(style_str):
    """Convert CSS border style to reportlab dash pattern"""
    if not style_str:
        return []  # solid
    
    style_str = style_str.lower().strip()
    
    if style_str == 'none':
        return None  # Special value for no border
    elif style_str == 'dashed':
        return [3, 3]  # 3 points on, 3 points off
    elif style_str == 'dotted':
        return [1, 2]  # 1 point on, 2 points off
    else:
        return []  # solid for anything else

class ProjectData:
    def __init__(self):
        self.project_id = str(uuid.uuid4())
        self.created_at = datetime.now().isoformat()
        self.pdf_data = None
        self.pdf_filename = ""
        self.annotations = []
        self.metadata = {}

    def to_dict(self):
        return {
            'project_id': self.project_id,
            'created_at': self.created_at,
            'pdf_filename': self.pdf_filename,
            'annotations': self.annotations,
            'metadata': self.metadata
        }

@app.route('/api/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload a PDF file and return its content for frontend processing"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'File must be a PDF'}), 400
    
    try:
        # Read PDF file
        pdf_data = file.read()
        pdf_reader = PdfReader(BytesIO(pdf_data))
        
        # Get PDF info
        num_pages = len(pdf_reader.pages)
        
        # Convert PDF to base64 for frontend
        pdf_base64 = base64.b64encode(pdf_data).decode('utf-8')
        
        return jsonify({
            'success': True,
            'pdf_data': pdf_base64,
            'filename': file.filename,
            'num_pages': num_pages,
            'message': 'PDF uploaded successfully'
        })
    
    except Exception as e:
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

@app.route('/api/save-project', methods=['POST'])
def save_project():
    """Save project data to a binary file"""
    try:
        data = request.json
        
        # Create project data object
        project = ProjectData()
        project.pdf_data = data.get('pdf_data', '')
        project.pdf_filename = data.get('pdf_filename', '')
        project.annotations = data.get('annotations', [])
        project.metadata = data.get('metadata', {})
        
        # Save to binary file
        filename = f"project_{project.project_id}.pkl"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(filepath, 'wb') as f:
            pickle.dump(project, f)
        
        return jsonify({
            'success': True,
            'project_id': project.project_id,
            'filename': filename,
            'message': 'Project saved successfully'
        })
    
    except Exception as e:
        return jsonify({'error': f'Error saving project: {str(e)}'}), 500

@app.route('/api/load-project/<project_id>', methods=['GET'])
def load_project(project_id):
    """Load project data from binary file"""
    try:
        filename = f"project_{project_id}.pkl"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'Project not found'}), 404
        
        with open(filepath, 'rb') as f:
            project = pickle.load(f)
        
        return jsonify({
            'success': True,
            'project_data': project.to_dict(),
            'pdf_data': project.pdf_data,
            'message': 'Project loaded successfully'
        })
    
    except Exception as e:
        return jsonify({'error': f'Error loading project: {str(e)}'}), 500

@app.route('/api/list-projects', methods=['GET'])
def list_projects():
    """List all saved projects"""
    try:
        projects = []
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.startswith('project_') and filename.endswith('.pkl'):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                try:
                    with open(filepath, 'rb') as f:
                        project = pickle.load(f)
                    
                    projects.append({
                        'project_id': project.project_id,
                        'created_at': project.created_at,
                        'pdf_filename': project.pdf_filename,
                        'filename': filename,
                        'annotation_count': len(project.annotations)
                    })
                except:
                    continue
        
        # Sort by creation date
        projects.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'success': True,
            'projects': projects
        })
    
    except Exception as e:
        return jsonify({'error': f'Error listing projects: {str(e)}'}), 500

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    """Generate a PDF with annotations overlaid for printing"""
    try:
        print("=== PDF Generation Request ===")
        data = request.json
        print(f"Request data keys: {list(data.keys()) if data else 'No data'}")
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        pdf_data = base64.b64decode(data['pdf_data'])
        annotations = data.get('annotations', [])
        
        print(f"PDF data length: {len(pdf_data)} bytes")
        print(f"Number of annotations: {len(annotations)}")
        for i, ann in enumerate(annotations):
            print(f"Annotation {i}: {ann}")
        
        # Read original PDF
        pdf_reader = PdfReader(BytesIO(pdf_data))
        pdf_writer = PdfWriter()
        
        print(f"Original PDF has {len(pdf_reader.pages)} pages")
        
        # Process each page
        for page_num in range(len(pdf_reader.pages)):
            page = pdf_reader.pages[page_num]
            page_box = page.mediabox
            page_width = float(page_box.width)
            page_height = float(page_box.height)
            
            print(f"Page {page_num + 1}: {page_width} x {page_height}")
            
            # Get page annotations (using 0-based indexing consistently)
            page_annotations = [ann for ann in annotations if ann.get('page', 0) == page_num]
            
            print(f"Page {page_num + 1} has {len(page_annotations)} annotations")
            
            if page_annotations:
                # Create overlay with annotations
                packet = BytesIO()
                can = canvas.Canvas(packet, pagesize=(page_width, page_height))
                
                for annotation in page_annotations:
                    x = float(annotation.get('x', 0))
                    y = float(annotation.get('y', 0))
                    width = float(annotation.get('width', 100))
                    height = float(annotation.get('height', 20))
                    value = str(annotation.get('value', ''))
                    
                    print(f"  Original annotation: '{value}' at web({x},{y}) size({width},{height})")
                    
                    # Skip annotations that are completely outside the page bounds
                    if x >= page_width or y >= page_height or x + width <= 0 or y + height <= 0:
                        print(f"  Skipping annotation outside bounds: x={x}, y={y}, page_size=({page_width},{page_height})")
                        continue
                    
                    # Clip coordinates to page bounds but don't force them to arbitrary values
                    clipped_x = max(0, min(x, page_width - 1))
                    clipped_y = max(0, min(y, page_height - 1))
                    clipped_width = min(width, page_width - clipped_x)
                    clipped_height = min(height, page_height - clipped_y)
                    
                    # Convert web coordinates (top-left origin) to PDF coordinates (bottom-left origin)
                    pdf_x = clipped_x
                    pdf_y = page_height - clipped_y - clipped_height
                    
                    print(f"  Final annotation: '{value}' at web({clipped_x},{clipped_y}) -> pdf({pdf_x},{pdf_y}) size({clipped_width},{clipped_height})")
                    
                    if annotation.get('type') == 'text':
                        # Set font and size
                        can.setFont("Helvetica", 12)
                        can.setFillColor("black")
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Determine if border should be drawn
                        should_draw_border = border_style is not None
                        
                        if should_draw_border:
                            # Apply border styling
                            can.setStrokeColor(border_color)
                            can.setLineWidth(border_width)
                            if border_style:
                                can.setDash(border_style)
                            else:
                                can.setDash([])  # solid line
                        
                        # Draw text with border box (stroke=1 if border, stroke=0 if no border)
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, fill=0)
                        
                        # Draw text inside the box
                        text_x = pdf_x + 2  # small padding
                        text_y = pdf_y + (clipped_height / 2) - 3  # center vertically
                        can.drawString(text_x, text_y, value)
                        
                    elif annotation.get('type') == 'date':
                        # Similar handling for date fields
                        can.setFont("Helvetica", 12)
                        can.setFillColor("black")
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Determine if border should be drawn
                        should_draw_border = border_style is not None
                        
                        if should_draw_border:
                            # Apply border styling
                            can.setStrokeColor(border_color)
                            can.setLineWidth(border_width)
                            if border_style:
                                can.setDash(border_style)
                            else:
                                can.setDash([])  # solid line
                        
                        # Draw date with border box (stroke=1 if border, stroke=0 if no border)
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, fill=0)
                        
                        text_x = pdf_x + 2
                        text_y = pdf_y + (clipped_height / 2) - 3
                        can.drawString(text_x, text_y, value)
                        
                    elif annotation.get('type') == 'signature':
                        # Handle signature fields - similar to text but potentially with italic font
                        can.setFont("Helvetica-Oblique", 12)  # Italic for signature style
                        can.setFillColor("black")
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Determine if border should be drawn
                        should_draw_border = border_style is not None
                        
                        if should_draw_border:
                            # Apply border styling
                            can.setStrokeColor(border_color)
                            can.setLineWidth(border_width)
                            if border_style:
                                can.setDash(border_style)
                            else:
                                can.setDash([])  # solid line
                        
                        # Draw signature with border box (stroke=1 if border, stroke=0 if no border)
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, fill=0)
                        
                        text_x = pdf_x + 2
                        text_y = pdf_y + (clipped_height / 2) - 3
                        can.drawString(text_x, text_y, value)
                
                can.save()
                packet.seek(0)
                
                # Merge overlay with original page
                overlay_pdf = PdfReader(packet)
                page.merge_page(overlay_pdf.pages[0])
                print(f"  Merged overlay for page {page_num + 1}")
            
            pdf_writer.add_page(page)
        
        # Save to bytes
        output = BytesIO()
        pdf_writer.write(output)
        output.seek(0)
        
        print(f"Generated PDF size: {len(output.getvalue())} bytes")
        print("=== PDF Generation Complete ===")
        
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='annotated_document.pdf'
        )
    
    except Exception as e:
        print(f"ERROR in PDF generation: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error generating PDF: {str(e)}'}), 500
        
        # Save to bytes
        output = BytesIO()
        pdf_writer.write(output)
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/pdf',
            as_attachment=True,
            download_name='annotated_document.pdf'
        )
    
    except Exception as e:
        return jsonify({'error': f'Error generating PDF: {str(e)}'}), 500

@app.route('/api/insert-page', methods=['POST'])
def insert_page():
    """Insert an empty page into the PDF at specified position"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        # Get required parameters
        pdf_data = data.get('pdfData')
        page_index = data.get('pageIndex')  # 0-based index where to insert
        position = data.get('position')  # 'before' or 'after'
        
        if not pdf_data:
            return jsonify({'error': 'PDF data is required'}), 400
            
        if page_index is None:
            return jsonify({'error': 'Page index is required'}), 400
            
        if position not in ['before', 'after']:
            return jsonify({'error': 'Position must be "before" or "after"'}), 400
        
        # Decode the PDF data
        pdf_bytes = base64.b64decode(pdf_data)
        
        # Read the original PDF
        reader = PdfReader(BytesIO(pdf_bytes))
        writer = PdfWriter()
        
        # Calculate actual insertion index
        if position == 'after':
            insert_index = page_index + 1
        else:
            insert_index = page_index
            
        # Ensure insert_index is within valid range
        insert_index = max(0, min(insert_index, len(reader.pages)))
        
        # Create an empty page with the same size as the first page
        if len(reader.pages) > 0:
            first_page = reader.pages[0]
            page_width = float(first_page.mediabox.width)
            page_height = float(first_page.mediabox.height)
        else:
            # Default to letter size if no pages exist
            page_width, page_height = letter
        
        # Create a blank page using reportlab
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=(page_width, page_height))
        c.showPage()  # Create an empty page
        c.save()
        buffer.seek(0)
        
        # Read the blank page
        blank_page_reader = PdfReader(buffer)
        blank_page = blank_page_reader.pages[0]
        
        # Add pages to writer in correct order
        for i, page in enumerate(reader.pages):
            if i == insert_index:
                writer.add_page(blank_page)
            writer.add_page(page)
        
        # If inserting at the end, add the blank page
        if insert_index >= len(reader.pages):
            writer.add_page(blank_page)
        
        # Write the modified PDF to a buffer
        output_buffer = BytesIO()
        writer.write(output_buffer)
        output_buffer.seek(0)
        
        # Convert to base64 for response
        modified_pdf_data = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'pdfData': modified_pdf_data,
            'message': f'Empty page inserted {position} page {page_index + 1}'
        })
        
    except Exception as e:
        return jsonify({'error': f'Error inserting page: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'PDF Annotation API is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)