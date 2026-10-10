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
      // The app imports 'react-native-fs'; this points it at the maintained fork
      // '@dr.pogodin/react-native-fs', the only RNFS native module we ship.
      'react-native-fs': path.resolve(__dirname, 'src/shims/react-native-fs.ts'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
