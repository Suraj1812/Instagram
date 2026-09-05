const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

module.exports = function withGeneratedAndroidIcon(config) {
  return withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const resRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
      const drawableRoot = path.join(resRoot, 'drawable');
      const adaptiveRoot = path.join(resRoot, 'mipmap-anydpi-v26');
      const logoPath = path.join(projectRoot, 'assets', 'logo.png');

      fs.mkdirSync(drawableRoot, { recursive: true });
      fs.mkdirSync(adaptiveRoot, { recursive: true });

      // Keep the generated logo as the complete adaptive-icon background.
      // The empty foreground prevents Android from adding a second plate/halo.
      fs.copyFileSync(logoPath, path.join(drawableRoot, 'icon_background.png'));

      const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/icon_background" />
    <foreground android:drawable="@drawable/icon_foreground" />
</adaptive-icon>
`;
      fs.writeFileSync(path.join(adaptiveRoot, 'ic_launcher.xml'), adaptiveIcon);
      fs.writeFileSync(path.join(adaptiveRoot, 'ic_launcher_round.xml'), adaptiveIcon);

      fs.writeFileSync(
        path.join(drawableRoot, 'icon_foreground.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
</shape>
`,
      );

      return modConfig;
    },
  ]);
};
