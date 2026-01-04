# Installing DCIM Dependencies

The DCIM Analytics feature requires additional packages to be installed. The app will run without them, but charts and advanced analytics will be disabled.

## Required Packages

Run this command to install all DCIM dependencies:

```bash
npm install @tensorflow/tfjs simple-statistics arima slayer isolation-forest echarts echarts-for-react
```

## Package Sizes

- `@tensorflow/tfjs`: ~1.7MB (tree-shakable to ~500KB)
- `echarts` + `echarts-for-react`: ~600KB
- `arima`: ~200KB
- `isolation-forest`: ~15KB
- `slayer`: ~8KB
- `simple-statistics`: ~30KB

**Total**: ~3MB uncompressed (significantly smaller when bundled and minified)

## After Installation

1. Restart your dev server (`npm run dev`)
2. The DCIM Analytics tab will be fully functional
3. Charts and ML analysis will be available

## Running Without Dependencies

The app will run without these packages, but:
- The DCIM Analytics tab will show a message asking you to install the packages
- Charts will not render
- Advanced ML analysis (TensorFlow.js, ARIMA) will be unavailable
- Basic statistical analysis will still work (using fallback implementations)

