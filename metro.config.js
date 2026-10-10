const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');


// Local stand-ins for Off Grid's private shared packages, kept in packages/.
const localPackage = name => path.resolve(__dirname, 'packages', name, 'src/index.ts');

const config = {
  resolver: {
    extraNodeModules: {
      '@offgrid/chat': localPackage('chat'),
      '@offgrid/models': localPackage('models'),
      '@offgrid/rag': localPackage('rag'),
      '@offgrid/speech': localPackage('speech'),
      '@offgrid/ui': localPackage('ui'),
      // Single source of truth for react-native-fs. The app imports
      // 'react-native-fs', but executorch's bare-resource-fetcher pulls the
      // maintained fork '@dr.pogodin/react-native-fs'. Shipping both produces
      // duplicate RNFS Objective-C symbols at link time on iOS, so we alias the
      // old name onto the fork and keep a single native module.
      'react-native-fs': path.resolve(__dirname, 'src/shims/react-native-fs.ts'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
