module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable ESLint plugin
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ESLintWebpackPlugin'
      );
      // Add support for .mjs files
      webpackConfig.module.rules.push({
        test: /\.mjs$/,
        include: /node_modules/,
        type: 'javascript/auto',
      });

      // Update resolve extensions to include .mjs
      webpackConfig.resolve.extensions = [
        ...webpackConfig.resolve.extensions,
        '.mjs'
      ];

      // Configure module resolution for ES modules
      webpackConfig.resolve.mainFields = [
        'browser',
        'module',
        'main'
      ];

      // Add fallback for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "process": require.resolve("process/browser"),
        "buffer": require.resolve("buffer"),
      };

      return webpackConfig;
    },
  },
  babel: {
    presets: [
      [
        '@babel/preset-env',
        {
          targets: {
            node: 'current',
          },
          modules: 'auto',
        },
      ],
    ],
    plugins: [
      '@babel/plugin-transform-optional-chaining',
      '@babel/plugin-transform-nullish-coalescing-operator',
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-private-property-in-object',
      '@babel/plugin-transform-numeric-separator',
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    ],
  },
}; 