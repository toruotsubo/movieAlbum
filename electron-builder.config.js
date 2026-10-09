require('dotenv').config();

/**
 * @type {import('electron-builder').Configuration}
 */
module.exports = {
  appId: 'com.moviealbum.app',
  productName: 'movieAlbum',
  directories: {
    output: 'release',
  },
  files: [
    'dist-electron/**/*',
    'out/**/*',
  ],
  asarUnpack: [
    '**/node_modules/ffmpeg-static/**/*',
  ],
  extraFiles: [
    {
      from: 'LICENSE',
      to: 'LICENSE.txt',
    },
    {
      from: 'licenses/LICENSE-FFMPEG.txt',
      to: 'LICENSE-FFMPEG.txt',
    },
    {
      from: 'licenses/THIRD_PARTY_LICENSES.txt',
      to: 'THIRD_PARTY_LICENSES.txt',
    },
  ],
  icon: 'build/icon.png',
  win: {
    icon: 'build/icon.ico',
    target: [
      'nsis',
      'appx',
    ],
  },
  appx: {
    applicationId: process.env.APPX_APPLICATION_ID || 'com.moviealbum.app',
    identityName: process.env.APPX_IDENTITY_NAME || 'WebStudioTokotan.movieAlbum',
    publisher: process.env.APPX_PUBLISHER || '',
    publisherDisplayName: process.env.APPX_PUBLISHER_DISPLAY_NAME || 'Web Studio Tokotan',
    languages: [
      'ja-JP',
      'en-US',
      'zh-CN',
      'zh-TW',
    ],
  },
};
