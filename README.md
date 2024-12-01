# CS2 Case Stats (extension)

## Overview
**CS2 Case Stats** is a browser extension that analyzes your CS2 inventory history to generate comprehensive statistics about your case openings. Unlike other tools, it works without requiring any API keys, making it more accessible, secure, and user-friendly.

## Features
- **Case Opening Statistics**: Track detailed metrics about your case openings:
  - Total cases opened
  - Total golds obtained
  - Total cash invested
  - Most frequently opened case
  - Cases since last gold
  - Drop rate percentages for:
    - Gold items
    - Covert items
    - Classified items
    - Restricted items
    - Mil-Spec items
    - StatTrak™ items
- **No API Key Required**: Access your statistics directly through your inventory history, eliminating the need for Steam API keys or external authentication.

## How It Works
**CS2 Case Stats** processes your inventory history directly from your browser, collecting data about your case openings.

- No need for API keys
- Enhanced privacy - your data stays in your browser

## Installation

### Last released versions
- [Chrome Web Store](https://chromewebstore.google.com/detail/cs2-case-stats-steamtools/liijobbiponnejejcfpbbmkanlnhhkoo)
- Firefox Add-ons (coming soon)

### For Development

Clone the repository:
```bash
$ git clone https://github.com/joaopugsley/casestats-ext.git
```
Install dependencies:
```bash
$ npm install
```
Run the project:
```bash
# chrome
$ npm run dev:chrome

# firefox
$ npm run dev:firefox
```

## Contributing
We welcome contributions! If you'd like to help improve **CS2 Case Stats**:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingNewFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingNewFeature'`)
4. Push to the branch (`git push origin feature/AmazingNewFeature`)
5. Open a Pull Request (Write a descriptive message about what you've changed)

## License
The `CS2 Case Stats` source files are distributed under the MIT License found in the `LICENSE` file.