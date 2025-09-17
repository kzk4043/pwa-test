# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Progressive Web Application (PWA) test project** designed for educational purposes and deployed on GitHub Pages. The primary goal is to test PWA functionality on Android devices with comprehensive documentation for learning PWA concepts.

**Key Principle**: Intentionally simple implementation focusing on PWA feature testing rather than complex UI.

## Technology Stack

- **Frontend**: Vanilla JavaScript (no frameworks by design)
- **Hosting**: GitHub Pages (provides required HTTPS)
- **Deployment**: Static file serving via GitHub Pages
- **Target Platform**: Android Chrome (primary), with iOS limitations documented

## Project Structure

```
pwa-test/
├── index.html               # Main PWA interface with test buttons
├── manifest.json           # PWA manifest file
├── sw.js                   # Service Worker (heavily commented)
├── offline.html            # Offline fallback page
├── js/
│   ├── app.js              # Main application logic
│   ├── install.js          # PWA installation handling
│   └── push.js             # Push notification handling
├── css/
│   └── style.css           # Minimal styling
├── icons/                  # PWA icons (various sizes)
└── docs/                   # Educational documentation
    ├── PWA基礎.md
    ├── Service-Worker解説.md
    ├── プッシュ通知の仕組み.md
    ├── iOS制限事項.md
    └── テスト手順.md
```

## Development Commands

**No build system** - This project intentionally uses vanilla JavaScript with no build tools or package.json.

### Development Workflow
1. Edit files directly
2. Test locally with `python -m http.server` or similar local server
3. Commit and push to deploy via GitHub Pages
4. Test on Android devices using the GitHub Pages URL

### Testing Commands
- **Local Server**: `python -m http.server 8000` (for HTTPS testing, use browser dev tools)
- **Git Operations**: Standard git commands for deployment
- **No linting/build**: Files are served directly

## Core PWA Implementation Features

### 1. Service Worker (sw.js)
- **Heavy commenting required** for educational purposes
- Implements cache-first strategy for offline functionality
- Handles install, activate, and fetch events
- Must include detailed console.log statements for debugging

### 2. Web App Manifest (manifest.json)
- Enables "Add to Home Screen" functionality
- Requires multiple icon sizes for different devices
- Must be properly linked in index.html

### 3. Installation Management
- Custom installation prompt using beforeinstallprompt event
- Installation state tracking and UI updates
- Handles user acceptance/rejection of install prompt

### 4. Push Notifications
- Notification permission flow implementation
- Service Worker notification handling
- Badge display and click handling
- Backend integration ready (push server to be implemented separately)

### 5. Offline Functionality
- Cache strategies for essential resources
- Offline fallback page (offline.html)
- Cache versioning and update strategies

## Architecture Patterns

### File Organization
- **js/app.js**: Main application initialization and UI handling
- **js/install.js**: PWA installation logic isolated for clarity
- **js/push.js**: Push notification handling separated for modularity
- **sw.js**: Service Worker at root level (required for scope)

### Code Style Requirements
- **Extensive commenting**: Every PWA concept must be explained in comments
- **Console logging**: Comprehensive logging for debugging and learning
- **Error handling**: Robust error handling with user-friendly messages
- **Modular design**: Each PWA feature isolated in separate files

### UI Philosophy
- **Minimal interface**: Simple buttons and status displays only
- **Functional focus**: Each button tests a specific PWA feature
- **Status feedback**: Clear status messages for each feature state

## Testing Strategy

### Target Environment
- **Primary**: Android Chrome browser
- **Secondary**: Chrome DevTools simulation
- **Documentation**: iOS limitations and workarounds

### Test Coverage
- PWA installability on Android
- Service Worker caching and offline functionality
- Push notification permissions and delivery
- Background sync capabilities
- Icon and splash screen display

## GitHub Pages Considerations

- **Base URL**: Account for repository name in paths if not using custom domain
- **HTTPS**: Automatically provided by GitHub Pages (required for PWA)
- **Deployment**: Direct file serving - any push to main branch deploys immediately
- **Caching**: Service Worker cache versioning important for updates

## Documentation Standards

When creating documentation files in `docs/`:
- Use Japanese language as specified in the requirements
- Focus on educational content explaining PWA concepts
- Include practical examples and troubleshooting
- Cover both successful cases and common failure modes
- Provide step-by-step testing procedures

## Important Notes

- **No package.json**: This is intentional - avoid suggesting npm dependencies
- **No build tools**: Avoid suggesting bundlers, transpilers, or build systems
- **Educational focus**: Prioritize learning value over production optimization
- **Android-first**: Design and test primarily for Android Chrome
- **Modular push backend**: Push notification server integration should be additive