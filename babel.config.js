module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@services': './src/services',
            '@utils': './src/utils',
            '@types': './src/types'
          }
        }
      ],
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env.local',  // Changed from .env to .env.local
        safe: false,
        allowUndefined: true,
      }],
      // 'react-native-reanimated/plugin', // Temporarily disabled to test splash screen
    ]
  };
};