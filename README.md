# Kaira Chrome Extension

A simple Chrome extension with TypeScript and side panel functionality.

## Project Structure

```
kaira/
├── dist/               # Generated distribution files
├── src/                # Source files
│   ├── background/     # Background scripts
│   ├── popup/          # Popup UI
│   ├── sidepanel/      # Side panel UI
│   └── manifest.json   # Extension manifest
├── package.json        # Project dependencies
├── tsconfig.json       # TypeScript configuration
└── webpack.config.js   # Webpack configuration
```

## Development

1. Install dependencies:
```
npm install
```

2. Build the extension:
```
npm run build
```

3. For development with hot reloading:
```
npm run watch
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

## Templates

All UI components (popup, side panel) are set up as simple "Hello World" templates to make it easy for you to start building your own functionality.

## Features

- TypeScript support
- Webpack bundling
- Hot reloading during development
- Side panel API integration

## Notes

- Icons are not included in this version. You can add your own icons later by updating the manifest.json file and adding icon files. 