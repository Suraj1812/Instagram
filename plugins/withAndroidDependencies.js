const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withAndroidDependencies(config) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') {
      return modConfig;
    }

    const appCompatDependency = 'implementation("androidx.appcompat:appcompat:1.6.1")';
    const materialDependency = 'implementation("com.google.android.material:material:1.11.0")';

    if (!modConfig.modResults.contents.includes(appCompatDependency)) {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        'implementation("com.facebook.react:react-android")',
        [
          'implementation("com.facebook.react:react-android")',
          `    ${appCompatDependency}`,
          `    ${materialDependency}`,
        ].join('\n'),
      );
    }

    return modConfig;
  });
};
