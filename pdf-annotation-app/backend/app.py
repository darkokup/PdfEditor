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
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import uuid
from datetime import datetime
import sys

# Force stdout to flush immediately
sys.stdout.reconfigure(line_buffering=True)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'], 
     allow_headers=['Content-Type'], 
     methods=['GET', 'POST', 'OPTIONS'])

# Register TrueType fonts if available on Windows
def register_system_fonts():
    """Register common Windows system fonts with reportlab"""
    windows_fonts_dir = "C:/Windows/Fonts/"
    
    font_files = {
        'Comic-Sans-MS': 'comic.ttf',
        'Comic-Sans-MS-Bold': 'comicbd.ttf',
        'Comic-Sans-MS-Italic': 'comici.ttf',
        'Comic-Sans-MS-BoldItalic': 'comicz.ttf',
        'Georgia': 'georgia.ttf',
        'Georgia-Bold': 'georgiab.ttf',
        'Georgia-Italic': 'georgiai.ttf',
        'Georgia-BoldItalic': 'georgiaz.ttf',
        'Verdana': 'verdana.ttf',
        'Verdana-Bold': 'verdanab.ttf',
        'Verdana-Italic': 'verdanai.ttf',
        'Verdana-BoldItalic': 'verdanaz.ttf',
        'Tahoma': 'tahoma.ttf',
        'Tahoma-Bold': 'tahomabd.ttf',
        'Palatino': 'pala.ttf',
        'Palatino-Bold': 'palab.ttf',
        'Palatino-Italic': 'palai.ttf',
        'Palatino-BoldItalic': 'palabi.ttf',
        'Garamond': 'gara.ttf',
        'Garamond-Bold': 'garabd.ttf',
        'Garamond-Italic': 'garait.ttf',
        'Calibri': 'calibri.ttf',
        'Calibri-Bold': 'calibrib.ttf',
        'Calibri-Italic': 'calibrii.ttf',
        'Calibri-BoldItalic': 'calibriz.ttf',
        'Cambria': 'cambria.ttc',
        'Cambria-Bold': 'cambriab.ttf',
        'Cambria-Italic': 'cambriai.ttf',
        'Cambria-BoldItalic': 'cambriaz.ttf',
        'Consolas': 'consola.ttf',
        'Consolas-Bold': 'consolab.ttf',
        'Consolas-Italic': 'consolai.ttf',
        'Consolas-BoldItalic': 'consolaz.ttf',
        'Impact': 'impact.ttf',
        'Trebuchet-MS': 'trebuc.ttf',
        'Trebuchet-MS-Bold': 'trebucbd.ttf',
        'Trebuchet-MS-Italic': 'trebucit.ttf',
        'Trebuchet-MS-BoldItalic': 'trebucbi.ttf',
        'Arial-Black': 'ariblk.ttf',
    }
    
    registered_fonts = []
    for font_name, font_file in font_files.items():
        font_path = os.path.join(windows_fonts_dir, font_file)
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                registered_fonts.append(font_name)
            except Exception as e:
                print(f"Failed to register font {font_name}: {e}")
    
    if registered_fonts:
        print(f"Successfully registered {len(registered_fonts)} system fonts")
        with open('font_mapping.log', 'a', encoding='utf-8') as f:
            f.write(f"\n=== Registered {len(registered_fonts)} system fonts ===\n")
            for font in registered_fonts:
                f.write(f"  {font}\n")
    
    return registered_fonts

# Register fonts on startup
REGISTERED_FONTS = register_system_fonts()

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

def map_font_family(font_family, font_bold=False, font_italic=False):
    """
    Map CSS font family and style to reportlab font name.
    Returns font name that reportlab can use.
    Now supports TrueType fonts if registered, otherwise falls back to built-in fonts:
    - Helvetica (normal, bold, oblique, bold-oblique)
    - Times-Roman (normal, bold, italic, bold-italic)
    - Courier (normal, bold, oblique, bold-oblique)
    
    font_bold: boolean indicating if text should be bold
    font_italic: boolean indicating if text should be italic
    Note: strikethrough is handled separately via text decoration, not font
    """
    if not font_family:
        font_family = 'Arial'
    
    # Write to log file for debugging
    try:
        with open('font_mapping.log', 'a', encoding='utf-8') as f:
            f.write(f"Mapping font '{font_family}', bold={font_bold}, italic={font_italic}\n")
    except:
        pass
    
    # Try to use registered TrueType fonts first
    ttf_font_map = {
        'Comic Sans MS': 'Comic-Sans-MS',
        'Georgia': 'Georgia',
        'Verdana': 'Verdana',
        'Tahoma': 'Tahoma',
        'Palatino': 'Palatino',
        'Garamond': 'Garamond',
        'Calibri': 'Calibri',
        'Cambria': 'Cambria',
        'Consolas': 'Consolas',
        'Impact': 'Impact',
        'Trebuchet MS': 'Trebuchet-MS',
        'Arial Black': 'Arial-Black',
    }
    
    # Check if we have a TTF version of this font
    if font_family in ttf_font_map:
        base_ttf_name = ttf_font_map[font_family]
        
        # Build the font name with style
        if font_bold and font_italic:
            ttf_name = f'{base_ttf_name}-BoldItalic'
        elif font_bold:
            ttf_name = f'{base_ttf_name}-Bold'
        elif font_italic:
            ttf_name = f'{base_ttf_name}-Italic'
        else:
            ttf_name = base_ttf_name
        
        # Check if this font variant is registered
        if ttf_name in REGISTERED_FONTS:
            try:
                with open('font_mapping.log', 'a', encoding='utf-8') as f:
                    f.write(f"  Using TTF font: '{ttf_name}'\n")
            except:
                pass
            return ttf_name
        # If specific variant not available, try base font
        elif base_ttf_name in REGISTERED_FONTS and not font_bold and not font_italic:
            try:
                with open('font_mapping.log', 'a', encoding='utf-8') as f:
                    f.write(f"  Using TTF font: '{base_ttf_name}'\n")
            except:
                pass
            return base_ttf_name
    
    # Fall back to built-in reportlab fonts
    # Map common web fonts to reportlab font families
    font_family_map = {
        # Sans-serif fonts -> Helvetica
        'Arial': 'Helvetica',
        'Helvetica': 'Helvetica',
        'Verdana': 'Helvetica',
        'Tahoma': 'Helvetica',
        'Geneva': 'Helvetica',
        'Calibri': 'Helvetica',
        'Candara': 'Helvetica',
        'Trebuchet MS': 'Helvetica',
        'Century Gothic': 'Helvetica',
        'Franklin Gothic Medium': 'Helvetica',
        'Comic Sans MS': 'Helvetica',
        
        # Serif fonts -> Times-Roman
        'Times New Roman': 'Times-Roman',
        'Georgia': 'Times-Roman',
        'Garamond': 'Times-Roman',
        'Palatino': 'Times-Roman',
        'Book Antiqua': 'Times-Roman',
        'Cambria': 'Times-Roman',
        
        # Monospace fonts -> Courier
        'Courier New': 'Courier',
        'Consolas': 'Courier',
        'Monaco': 'Courier',
        
        # Bold fonts -> Helvetica (will be made bold below)
        'Arial Black': 'Helvetica',
        'Impact': 'Helvetica',
        
        # Signature/Script fonts -> Helvetica (will be made oblique for handwriting effect)
        'Brush Script MT': 'Helvetica',
        'Lucida Handwriting': 'Helvetica',
        'Segoe Script': 'Helvetica',
        'Monotype Corsiva': 'Helvetica',
        
        # Decorative fonts
        'Papyrus': 'Times-Roman',
        'Copperplate': 'Times-Roman',
    }
    
    # Get base font family
    base_font = font_family_map.get(font_family, 'Helvetica')
    
    try:
        with open('font_mapping.log', 'a', encoding='utf-8') as f:
            f.write(f"  Fallback to built-in font, base: '{base_font}'\n")
    except:
        pass
    
    # Special handling for signature fonts - always use oblique/italic
    signature_fonts = ['Brush Script MT', 'Lucida Handwriting', 'Segoe Script', 'Monotype Corsiva']
    if font_family in signature_fonts:
        try:
            with open('font_mapping.log', 'a', encoding='utf-8') as f:
                f.write(f"  '{font_family}' is a signature font, forcing italic=True\n")
        except:
            pass
        font_italic = True
    
    # Special handling for Impact and Arial Black - always bold
    if font_family in ['Impact', 'Arial Black']:
        try:
            with open('font_mapping.log', 'a', encoding='utf-8') as f:
                f.write(f"  '{font_family}' is a bold font, forcing bold=True\n")
        except:
            pass
        font_bold = True
    
    # Apply font style based on bold and italic flags
    result_font = base_font  # Default
    
    if font_bold and font_italic:
        # Both bold and italic
        if base_font == 'Helvetica':
            result_font = 'Helvetica-BoldOblique'
        elif base_font == 'Times-Roman':
            result_font = 'Times-BoldItalic'
        elif base_font == 'Courier':
            result_font = 'Courier-BoldOblique'
    elif font_bold:
        # Only bold
        if base_font == 'Helvetica':
            result_font = 'Helvetica-Bold'
        elif base_font == 'Times-Roman':
            result_font = 'Times-Bold'
        elif base_font == 'Courier':
            result_font = 'Courier-Bold'
    elif font_italic:
        # Only italic
        if base_font == 'Helvetica':
            result_font = 'Helvetica-Oblique'
        elif base_font == 'Times-Roman':
            result_font = 'Times-Italic'
        elif base_font == 'Courier':
            result_font = 'Courier-Oblique'
    
    try:
        with open('font_mapping.log', 'a', encoding='utf-8') as f:
            f.write(f"  Final reportlab font: '{result_font}'\n")
    except:
        pass
    
    return result_font

def get_background_fill(annotation):
    """
    Determine background fill settings for an annotation.
    Returns tuple: (should_fill, fill_color)
    """
    # Check new backgroundColor property first
    bg_color = annotation.get('backgroundColor')
    
    if bg_color is None:
        # Fall back to old transparent property for backward compatibility
        transparent = annotation.get('transparent', False)
        if transparent:
            return (False, None)
        else:
            return (True, HexColor('#FFFFFF'))  # White background
    
    # Handle new backgroundColor values
    if bg_color == 'transparent':
        return (False, None)
    elif bg_color == 'white':
        return (True, HexColor('#FFFFFF'))
    else:
        # Custom color - parse it
        color = parse_color(bg_color)
        return (True, color)


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
                        # Get font properties from annotation
                        font_family = annotation.get('fontFamily', 'Arial')
                        font_bold = annotation.get('fontBold', False)
                        font_italic = annotation.get('fontItalic', False)
                        font_strikethrough = annotation.get('fontStrikethrough', False)
                        font_size = float(annotation.get('fontSize', 12))
                        font_color = parse_color(annotation.get('fontColor', '#000000'))
                        
                        # Map font family and style to reportlab font
                        reportlab_font = map_font_family(font_family, font_bold, font_italic)
                        
                        # Set font and size with error handling
                        try:
                            can.setFont(reportlab_font, font_size)
                        except Exception as e:
                            print(f"Warning: Failed to set font '{reportlab_font}' for text annotation, falling back to Helvetica. Error: {e}")
                            can.setFont('Helvetica', font_size)
                            reportlab_font = 'Helvetica'
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Get background fill settings
                        should_fill_bg, fill_color = get_background_fill(annotation)
                        
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
                        
                        # Set fill color if background should be filled
                        if should_fill_bg and fill_color:
                            can.setFillColor(fill_color)
                        
                        # Draw rectangle with border and/or fill
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, 
                                fill=1 if should_fill_bg else 0)
                        
                        # Draw text inside the box with font color (handle multiline)
                        can.setFillColor(font_color)
                        text_x = pdf_x + 2  # small padding
                        
                        # Split text by newlines and draw each line
                        lines = value.split('\n')
                        line_height = font_size * 1.2  # Line spacing
                        
                        # Calculate starting Y position (top of text block)
                        total_text_height = len(lines) * line_height
                        # Start from top and work down
                        start_y = pdf_y + clipped_height - line_height + (font_size / 3)
                        
                        for i, line in enumerate(lines):
                            line_y = start_y - (i * line_height)
                            can.drawString(text_x, line_y, line)
                            
                            # Draw strikethrough for this line if needed
                            if font_strikethrough:
                                text_width = can.stringWidth(line, reportlab_font, font_size)
                                strike_y = line_y + (font_size / 3)  # Position line through middle of text
                                can.setStrokeColor(font_color)
                                can.setLineWidth(1)  # Always use 1px line for strikethrough
                                can.setDash([])  # Reset to solid line (no dash pattern)
                                can.line(text_x, strike_y, text_x + text_width, strike_y)
                                can.setFillColor(font_color)  # Reset fill color for next line
                        
                    elif annotation.get('type') == 'date':
                        # Get font properties from annotation
                        font_family = annotation.get('fontFamily', 'Arial')
                        font_bold = annotation.get('fontBold', False)
                        font_italic = annotation.get('fontItalic', False)
                        font_strikethrough = annotation.get('fontStrikethrough', False)
                        font_size = float(annotation.get('fontSize', 12))
                        font_color = parse_color(annotation.get('fontColor', '#000000'))
                        
                        # Map font family and style to reportlab font
                        reportlab_font = map_font_family(font_family, font_bold, font_italic)
                        
                        # Set font and size with error handling
                        try:
                            can.setFont(reportlab_font, font_size)
                        except Exception as e:
                            print(f"Warning: Failed to set font '{reportlab_font}' for date annotation, falling back to Helvetica. Error: {e}")
                            can.setFont('Helvetica', font_size)
                            reportlab_font = 'Helvetica'
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Get background fill settings
                        should_fill_bg, fill_color = get_background_fill(annotation)
                        
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
                        
                        # Set fill color if background should be filled
                        if should_fill_bg and fill_color:
                            can.setFillColor(fill_color)
                        
                        # Draw rectangle with border and/or fill
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, 
                                fill=1 if should_fill_bg else 0)
                        
                        # Draw text with font color (handle multiline)
                        can.setFillColor(font_color)
                        text_x = pdf_x + 2
                        
                        # Split text by newlines and draw each line
                        lines = value.split('\n')
                        line_height = font_size * 1.2  # Line spacing
                        
                        # Calculate starting Y position (top of text block)
                        total_text_height = len(lines) * line_height
                        # Start from top and work down
                        start_y = pdf_y + clipped_height - line_height + (font_size / 3)
                        
                        for i, line in enumerate(lines):
                            line_y = start_y - (i * line_height)
                            can.drawString(text_x, line_y, line)
                            
                            # Draw strikethrough for this line if needed
                            if font_strikethrough:
                                text_width = can.stringWidth(line, reportlab_font, font_size)
                                strike_y = line_y + (font_size / 3)  # Position line through middle of text
                                can.setStrokeColor(font_color)
                                can.setLineWidth(1)  # Always use 1px line for strikethrough
                                can.setDash([])  # Reset to solid line (no dash pattern)
                                can.line(text_x, strike_y, text_x + text_width, strike_y)
                                can.setFillColor(font_color)  # Reset fill color for next line
                        
                    elif annotation.get('type') == 'signature':
                        # Get font properties from annotation
                        font_family = annotation.get('fontFamily', 'Brush Script MT')
                        font_bold = annotation.get('fontBold', False)
                        font_italic = annotation.get('fontItalic', False)
                        font_strikethrough = annotation.get('fontStrikethrough', False)
                        font_size = float(annotation.get('fontSize', 12))
                        font_color = parse_color(annotation.get('fontColor', '#000000'))
                        
                        # Map font family and style to reportlab font
                        reportlab_font = map_font_family(font_family, font_bold, font_italic)
                        
                        # Set font and size with error handling
                        try:
                            can.setFont(reportlab_font, font_size)
                        except Exception as e:
                            print(f"Warning: Failed to set font '{reportlab_font}' for signature annotation, falling back to Helvetica-Oblique. Error: {e}")
                            can.setFont('Helvetica-Oblique', font_size)
                            reportlab_font = 'Helvetica-Oblique'
                        
                        # Get border properties from annotation
                        border_color = parse_color(annotation.get('borderColor', 'black'))
                        border_style = parse_border_style(annotation.get('borderStyle', 'solid'))
                        border_width = float(annotation.get('borderWidth', 1))
                        
                        # Get background fill settings
                        should_fill_bg, fill_color = get_background_fill(annotation)
                        
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
                        
                        # Set fill color if background should be filled
                        if should_fill_bg and fill_color:
                            can.setFillColor(fill_color)
                        
                        # Draw rectangle with border and/or fill
                        can.rect(pdf_x, pdf_y, clipped_width, clipped_height, 
                                stroke=1 if should_draw_border else 0, 
                                fill=1 if should_fill_bg else 0)
                        
                        # Draw text with font color (handle multiline)
                        can.setFillColor(font_color)
                        text_x = pdf_x + 2
                        
                        # Split text by newlines and draw each line
                        lines = value.split('\n')
                        line_height = font_size * 1.2  # Line spacing
                        
                        # Calculate starting Y position (top of text block)
                        total_text_height = len(lines) * line_height
                        # Start from top and work down
                        start_y = pdf_y + clipped_height - line_height + (font_size / 3)
                        
                        for i, line in enumerate(lines):
                            line_y = start_y - (i * line_height)
                            can.drawString(text_x, line_y, line)
                            
                            # Draw strikethrough for this line if needed
                            if font_strikethrough:
                                text_width = can.stringWidth(line, reportlab_font, font_size)
                                strike_y = line_y + (font_size / 3)  # Position line through middle of text
                                can.setStrokeColor(font_color)
                                can.setLineWidth(1)  # Always use 1px line for strikethrough
                                can.setDash([])  # Reset to solid line (no dash pattern)
                                can.line(text_x, strike_y, text_x + text_width, strike_y)
                                can.setFillColor(font_color)  # Reset fill color for next line
                
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