#!/usr/bin/env python3
"""
Script to download essential open-source fonts for the PDF annotation application.
This downloads Liberation Fonts and select Google Fonts.
"""

import os
import urllib.request
import zipfile
import shutil

FONTS_DIR = os.path.join(os.path.dirname(__file__), 'fonts')

# Ensure fonts directory exists
os.makedirs(FONTS_DIR, exist_ok=True)

print("=" * 60)
print("PDF Annotation App - Font Downloader")
print("=" * 60)
print()

# Liberation Fonts - direct replacements for Arial, Times, Courier
print("Downloading Liberation Fonts...")
print("These are metric-compatible replacements for Arial, Times New Roman, and Courier New")
print()

liberation_url = "https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz"
liberation_archive = os.path.join(FONTS_DIR, "liberation.tar.gz")

try:
    print(f"  Downloading from GitHub...")
    urllib.request.urlretrieve(liberation_url, liberation_archive)
    print(f"  ✓ Downloaded successfully")
    
    # Extract and copy TTF files
    import tarfile
    with tarfile.open(liberation_archive, 'r:gz') as tar:
        for member in tar.getmembers():
            if member.name.endswith('.ttf'):
                member.name = os.path.basename(member.name)
                tar.extract(member, FONTS_DIR)
                print(f"  ✓ Extracted: {member.name}")
    
    os.remove(liberation_archive)
    print()
    
except Exception as e:
    print(f"  ✗ Error downloading Liberation Fonts: {e}")
    print(f"  Please download manually from:")
    print(f"  https://github.com/liberationfonts/liberation-fonts/releases")
    print()

# Google Fonts - Additional variety
google_fonts = {
    'Roboto': 'https://github.com/google/roboto/releases/download/v2.138/roboto-unhinted.zip',
    'Caveat': 'https://github.com/google/fonts/raw/main/ofl/caveat/Caveat%5Bwght%5D.ttf',
}

print("Downloading Google Fonts...")
print("These provide additional font variety and handwriting styles")
print()

for font_name, url in google_fonts.items():
    try:
        print(f"  Downloading {font_name}...")
        
        if url.endswith('.zip'):
            archive_path = os.path.join(FONTS_DIR, f"{font_name}.zip")
            urllib.request.urlretrieve(url, archive_path)
            
            with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                for file in zip_ref.namelist():
                    if file.endswith('.ttf') and not file.startswith('__MACOSX'):
                        # Extract just the filename
                        filename = os.path.basename(file)
                        # Read the file from zip
                        with zip_ref.open(file) as source:
                            target_path = os.path.join(FONTS_DIR, filename)
                            with open(target_path, 'wb') as target:
                                shutil.copyfileobj(source, target)
                        print(f"    ✓ Extracted: {filename}")
            
            os.remove(archive_path)
        else:
            # Direct TTF download
            filename = f"{font_name}-Regular.ttf"
            filepath = os.path.join(FONTS_DIR, filename)
            urllib.request.urlretrieve(url, filepath)
            print(f"    ✓ Downloaded: {filename}")
        
        print()
        
    except Exception as e:
        print(f"  ✗ Error downloading {font_name}: {e}")
        print()

print("=" * 60)
print("Font Installation Complete!")
print("=" * 60)
print()
print(f"Fonts installed to: {FONTS_DIR}")
print()
print("To add more fonts manually:")
print("  1. Visit https://fonts.google.com/")
print("  2. Download your desired fonts")
print("  3. Copy the .ttf files to the fonts/ directory")
print()
print("Restart the backend server to load the new fonts.")
print()
