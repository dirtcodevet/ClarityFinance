# Building the Windows Installer

This document explains how to build the Windows installer for Clarity Finance.

## Prerequisites

- Node.js and npm installed
- All project dependencies installed (`npm install`)
- Windows operating system (for building Windows installers)

## Build Commands

### Build Full Installer
```bash
npm run build
```

This creates a full Windows installer (.exe) in the `dist` directory.

### Build Directory Only (for testing)
```bash
npm run build:dir
```

This creates an unpacked directory in `dist/win-unpacked` for testing without creating an installer.

## Installer Features

The Windows installer includes:

### User Experience
- **Custom Installation Directory**: Users can choose where to install the app
- **Desktop Shortcut**: Optional shortcut created on the desktop
- **Start Menu Shortcut**: Shortcut added to Windows Start Menu
- **License Agreement**: Users must accept the license before installing
- **Uninstaller**: Automatic uninstaller creation

### Installation Defaults
- **Default Location**: `C:\Users\<Username>\AppData\Local\Programs\Clarity Finance`
- **Shortcut Name**: "Clarity Finance"
- **App ID**: `com.clarityfinance.app`

## Output Files

After running `npm run build`, you'll find:

```
dist/
├── Clarity Finance Setup 0.1.0.exe    # The installer executable
└── win-unpacked/                       # Unpacked application files (if --dir used)
```

## Customizing the Installer

### Application Icon

To add a custom icon:

1. Create or obtain a `.ico` file with multiple resolutions (16x16, 32x32, 48x48, 256x256)
2. Save it as `assets/icon.ico`
3. Update `package.json` to include icon references:

```json
"win": {
  "target": ["nsis"],
  "icon": "assets/icon.ico"
},
"nsis": {
  "installerIcon": "assets/icon.ico",
  "uninstallerIcon": "assets/icon.ico",
  // ... other settings
}
```

See `assets/README.md` for more details on icon requirements.

### Version Number

Update the version in `package.json`:

```json
{
  "version": "0.1.0"  // Change this
}
```

The installer filename will automatically use this version number.

### Company/Author Information

Update these fields in `package.json`:

```json
{
  "author": "Your Name or Company",
  "description": "Your custom description",
  "build": {
    "copyright": "Copyright © 2024 Your Name"
  }
}
```

## Testing the Installer

### Quick Test (No Installer)
```bash
npm run build:dir
cd dist/win-unpacked
"Clarity Finance.exe"
```

This runs the packaged app without creating an installer.

### Full Installer Test

1. Build the installer: `npm run build`
2. Run `dist/Clarity Finance Setup 0.1.0.exe`
3. Follow the installation wizard
4. Verify:
   - Desktop shortcut was created (if selected)
   - Start Menu shortcut exists
   - App launches correctly
   - Data is saved to the correct location

### Uninstaller Test

1. Open Windows Settings → Apps & features
2. Find "Clarity Finance"
3. Click Uninstall
4. Verify all files are removed

## Distribution

To distribute your application:

1. Build the installer: `npm run build`
2. The file `dist/Clarity Finance Setup 0.1.0.exe` is the distributable installer
3. Users can download and run this file to install Clarity Finance
4. **Important**: The .exe file is self-contained and includes all dependencies

## Troubleshooting

### Build Fails with "Cannot find module"
- Run `npm install` to ensure all dependencies are installed
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

### better-sqlite3 Native Module Issues
The build process automatically rebuilds native modules for the target platform.
If you encounter issues:
```bash
npm run rebuild
# or
npx electron-rebuild
```

### Installer Size is Large
This is normal. The installer includes:
- Electron runtime (~150MB)
- Node.js modules
- Application code
- better-sqlite3 native binaries

Typical installer size: 180-220MB

### Users Report "Windows Protected Your PC"
This is Windows SmartScreen. Users can click "More info" → "Run anyway".
To avoid this, you need to:
1. Sign the installer with a code signing certificate
2. Build up reputation with Microsoft SmartScreen over time

## Advanced Configuration

For more advanced installer customization options, see:
- [electron-builder documentation](https://www.electron.build/)
- [NSIS configuration options](https://www.electron.build/configuration/nsis)

## Data Storage

User data is stored separately from the installation directory:
- **Windows**: `C:\Users\<Username>\AppData\Roaming\ClarityFinance\`
- **Database**: `clarity.db`
- **Config**: `config.json` (if applicable)

This ensures user data persists across updates and uninstalls.
