# SELD Extension

SELD Extension is a Sinhala StarDict Dictionary browser extension built with React and [WXT](https://wxt.dev/) (Next-gen Web Extension Framework). 

This guide will walk you through setting up the project locally, running the development browser, and building the extension for production. You don't need any prior knowledge of WXT to get started!

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **[Node.js](https://nodejs.org/)** (v18 or higher recommended)
- **npm** (comes with Node.js) or **pnpm** / **yarn**

## Getting Started

Follow these steps to set up your local development environment:

### 1. Clone the Repository

Clone the project to your local machine:

```bash
git clone <your-repo-url>
cd SELD-extension
```

### 2. Install Dependencies

Install the required npm packages:

```bash
npm install
```

## Development

WXT makes extension development incredibly fast by providing a temporarily configured development browser with hot-module replacement (HMR). This means whenever you save a file, the extension will instantly update in the browser without needing a manual reload.

### Running in Google Chrome

To start the development server and open a temporary Chrome browser with the extension pre-installed:

```bash
npm run dev
```

### Running in Mozilla Firefox

To run the development environment in Firefox instead:

```bash
npm run dev -- -b firefox
```
*(Alternatively, you can use `npx wxt -b firefox`)*

**Note:** The browsers opened during development are completely temporary and isolated. They won't affect your personal browser profiles, history, or extensions.

## Building for Production

When you're ready to create a production-ready build of the extension:

### Build the Target

To compile the source code and build the extension:

```bash
npm run build
```
This will generate the compiled extension files inside the `.output` directory.

### Create a Zip Archive (For Web Stores)

To package the built extension into a `.zip` file for uploading to the Chrome Web Store or Firefox Add-ons site:

```bash
npm run zip
```
This will automatically build the extension and create a `.zip` file in the project folder.

## Project Structure

- **`entrypoints/`**: The core of a WXT extension. This contains your background scripts, content scripts, and UI pages (like side panels or popups).
  - **`sidepanel/`**: Contains the React code (`App.tsx`, `App.css`) for the extension's sidebar dictionary interface.
- **`assets/`**: Static assets like icons and fonts.
- **`wxt.config.ts`**: The main configuration file for WXT where manifest rules, permissions, and build settings are defined.

## Learn More about WXT

If you'd like to learn more about how the framework operates underneath, check out the [WXT Official Documentation](https://wxt.dev/).
