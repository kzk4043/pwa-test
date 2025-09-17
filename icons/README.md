# PWA Icons Directory

This directory contains the app icons for the "PWA機能テストアプリ" Progressive Web Application.

## Icon Requirements

Based on the `manifest.json` configuration, this PWA requires the following icon sizes:

| Size | File Name | Usage |
|------|-----------|-------|
| 72x72 | `icon-72x72.png` | Small app icons (Android) |
| 96x96 | `icon-96x96.png` | Medium app icons (Android) |
| 128x128 | `icon-128x128.png` | Medium-large app icons |
| 144x144 | `icon-144x144.png` | High-DPI app icons |
| 152x152 | `icon-152x152.png` | iOS and high-resolution displays |
| 192x192 | `icon-192x192.png` | **Minimum required size for PWAs** |
| 384x384 | `icon-384x384.png` | Large displays and splash screens |
| 512x512 | `icon-512x512.png` | **Highest quality / Master icon** |

## Design Specifications

### Technical Requirements
- **Format**: PNG with transparency support
- **Color depth**: 24-bit or 32-bit
- **Purpose**: `maskable any` (supports adaptive icons)
- **Theme color**: #2196F3 (Material Blue)
- **Background color**: #ffffff (White)

### Maskable Icon Guidelines
All icons are configured with `"purpose": "maskable any"`, which means they should follow maskable icon design principles:

1. **Safe Zone**: Keep important visual elements within the central 80% of the icon
2. **Bleed Area**: The outer 20% may be cropped by the system when applying masks
3. **Background**: Use a solid background color or design that works with transparency
4. **Testing**: Test icons with various masks and background colors

### Design Best Practices
- **Simplicity**: Keep the design simple and recognizable at small sizes
- **Contrast**: Ensure good contrast against both light and dark backgrounds
- **Consistency**: Maintain visual consistency across all sizes
- **Scalability**: Start with the 512x512 master icon and scale down
- **Brand Alignment**: Follow the app's color scheme and branding

## Creation Workflow

1. **Design Master Icon**: Create the 512x512 pixel version first
2. **Use Vector Graphics**: Design in vector format (SVG, AI) for best scaling
3. **Generate Sizes**: Scale down to create all required sizes
4. **Test Maskable**: Verify icons work with different masks and backgrounds
5. **Optimize**: Compress PNG files for web performance
6. **Replace Placeholders**: Replace the `.txt` placeholder files with actual `.png` icons

## Tools and Resources

### Design Tools
- **Adobe Illustrator/Photoshop**: Professional design tools
- **Figma**: Free web-based design tool
- **GIMP**: Free open-source alternative
- **Canva**: Simple online design tool

### PWA Icon Generators
- **PWA Asset Generator**: https://github.com/pwa-builder/PWABuilder
- **Favicon Generator**: https://realfavicongenerator.net/
- **App Icon Generator**: https://www.appicon.co/

### Testing Tools
- **Maskable.app**: https://maskable.app/ (Test maskable icons)
- **PWA Builder**: https://www.pwabuilder.com/ (PWA validation)
- **Lighthouse**: Chrome DevTools PWA audit

## Current Status

Currently, this directory contains placeholder `.txt` files for each required icon size. These files contain detailed specifications and guidelines for creating the actual PNG icons.

**Next Steps:**
1. Design and create the actual PNG icon files
2. Replace the placeholder `.txt` files with the corresponding `.png` files
3. Test the icons using the tools mentioned above
4. Validate the PWA manifest and icon implementation

## Shortcuts Integration

The 192x192 icon is also used for the app shortcut "インストールテスト" (Install Test) as defined in the manifest.json shortcuts section.