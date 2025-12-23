# Assets Directory

## Icon Requirements

For the Windows installer to work properly, you need to provide an application icon:

### icon.ico
- **Format:** Windows Icon (.ico)
- **Recommended sizes:** 256x256, 128x128, 64x64, 48x48, 32x32, 16x16 (multi-resolution .ico file)
- **Purpose:** Used for the application icon, installer icon, and uninstaller icon

### How to Create an Icon

1. Design your icon image (PNG recommended, 512x512px or larger)
2. Use an online tool to convert to .ico format:
   - https://convertio.co/png-ico/
   - https://icoconvert.com/
   - Or use a desktop tool like GIMP, Photoshop, or IcoFX

3. Save the resulting file as `icon.ico` in this directory

### Temporary Workaround

If you don't have an icon yet, the installer will use Electron's default icon.
The build process will still work without a custom icon file.

## Future Assets

You may also want to add:
- `banner.bmp` - Installer banner image (493x58 pixels)
- `background.bmp` - Installer background (164x314 pixels)
