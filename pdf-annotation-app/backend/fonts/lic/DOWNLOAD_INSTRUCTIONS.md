# Download Instructions for Open-Source Fonts

To ensure your PDF annotations render correctly on any server, download these free fonts and place them in this directory.

## Quick Start (Recommended)

### Option 1: Download Liberation Fonts (Best for compatibility)

1. Visit: https://github.com/liberationfonts/liberation-fonts/releases/latest
2. Download: `liberation-fonts-ttf-X.X.X.tar.gz` or `.zip`
3. Extract and copy these files to this `fonts/` directory:
   - LiberationSans-Regular.ttf
   - LiberationSans-Bold.ttf
   - LiberationSans-Italic.ttf
   - LiberationSans-BoldItalic.ttf
   - LiberationSerif-Regular.ttf
   - LiberationSerif-Bold.ttf
   - LiberationSerif-Italic.ttf
   - LiberationSerif-BoldItalic.ttf
   - LiberationMono-Regular.ttf
   - LiberationMono-Bold.ttf
   - LiberationMono-Italic.ttf
   - LiberationMono-BoldItalic.ttf

These fonts replace:
- Arial → Liberation Sans
- Times New Roman → Liberation Serif  
- Courier New → Liberation Mono

### Option 2: Install via Package Manager (Linux)

On Ubuntu/Debian:
```bash
sudo apt-get install fonts-liberation
# Then copy from /usr/share/fonts/truetype/liberation to this directory
```

On Fedora/RHEL:
```bash
sudo dnf install liberation-fonts
```

## Optional: Add More Variety

Download additional Google Fonts for more options:

### For Signatures/Handwriting:
- **Caveat**: https://fonts.google.com/specimen/Caveat
- **Dancing Script**: https://fonts.google.com/specimen/Dancing+Script

### Modern Sans-Serif:
- **Roboto**: https://fonts.google.com/specimen/Roboto
- **Open Sans**: https://fonts.google.com/specimen/Open+Sans

### Elegant Serif:
- **Merriweather**: https://fonts.google.com/specimen/Merriweather

### Monospace (Code):
- **Source Code Pro**: https://fonts.google.com/specimen/Source+Code+Pro

For each font:
1. Click the "Download family" button
2. Extract the .ttf files
3. Copy them to this `fonts/` directory
4. Rename if needed to match patterns (e.g., `Roboto-Regular.ttf`)

## Verify Installation

After adding fonts:
1. Restart the backend server
2. Check the console output for "Loading bundled fonts from: ..."
3. Check `font_mapping.log` to see which fonts were registered

## License

All suggested fonts are under SIL Open Font License 1.1, which allows:
- ✓ Commercial use
- ✓ Modification
- ✓ Distribution
- ✓ Private use

No attribution required in the application UI.
