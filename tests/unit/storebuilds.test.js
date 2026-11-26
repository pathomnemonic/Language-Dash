import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { APP_SCHEME } from '../../js/native.js';

/**
 * The App Store build is made in the cloud from the same code as the Android build, with its own project files.
 * These checks keep what the code relies on in step with what each store build provides.
 */
const codemagic = readFileSync('codemagic.yaml', 'utf8');
const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const config = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));

describe('both store builds', () => {
  it('open the app from the same email-link scheme the code expects', () => {
    expect(manifest).toContain('android:scheme="' + APP_SCHEME + '"');
    expect(codemagic).toContain('CFBundleURLSchemes:0 string ' + APP_SCHEME);
    expect(config.appId).toBe(APP_SCHEME);
    expect(codemagic).toContain('bundle_identifier: ' + APP_SCHEME);
  });

  it('get every native plugin the code imports (the iPhone project is generated from package.json)', () => {
    const imported = new Set();
    for (const f of ['native', 'platform', 'review', 'tts', 'reminders']) {
      for (const m of readFileSync('js/' + f + '.js', 'utf8').matchAll(/import\('(@capacitor[^']*)'\)/g)) imported.add(m[1]);
    }
    expect(imported.size).toBeGreaterThanOrEqual(8);
    for (const name of imported) expect(pkg.dependencies[name], name + ' is imported but not a dependency').toBeTruthy();
  });

  it('run the same web build; the iPhone stays upright and the iPad turns any way (iPhone and iPad both targeted)', () => {
    expect(codemagic).toMatch(/npx vite build/);
    expect(codemagic).toMatch(/UIInterfaceOrientationPortrait/);
    expect(codemagic).toMatch(/UISupportedInterfaceOrientations~ipad/);
    expect(codemagic).toMatch(/UIInterfaceOrientationLandscapeLeft/);
    expect(codemagic).toMatch(/TARGETED_DEVICE_FAMILY"\] = "1,2"/);
    expect(codemagic).toMatch(/cap sync ios/);
  });

  it('never rely on an Android-only address without checking the platform first', () => {
    const review = readFileSync('js/review.js', 'utf8');
    expect(review).toMatch(/platform === 'android'/);
    expect(review).toMatch(/platform === 'ios'/);
    // market:// is only ever produced inside the android branch
    const lines = review.split('\n');
    const i = lines.findIndex((l) => l.includes("'market://"));
    expect(lines.slice(Math.max(0, i - 3), i).join('\n')).toMatch(/android/);
  });

  it('Android: runs on Chromebooks and tablets (no touch screen or portrait requirement), can be resized, and only phones are held upright', () => {
    expect(manifest).toMatch(/android\.hardware\.touchscreen"\s+android:required="false"/);
    expect(manifest).toMatch(/android\.hardware\.screen\.portrait"\s+android:required="false"/);
    expect(manifest).toMatch(/android:resizeableActivity="true"/);
    expect(manifest).not.toMatch(/android:screenOrientation="portrait"/);
    const main = readFileSync('android/app/src/main/java/com/pathomnemonic/languagedash/MainActivity.java', 'utf8');
    expect(main).toMatch(/smallestScreenWidthDp < 600/);
  });
});

describe('the iOS cloud build is ready to run once the Apple account is active', () => {
  it('runs only when started by a person (no automatic trigger), with its App Store Connect integration named', () => {
    expect(codemagic).not.toMatch(/^\s*triggering:/m);
    expect(codemagic).toContain('app_store_connect: PathoMnemonic App Store Connect');
    expect(codemagic).toMatch(/submit_to_testflight: true/);
  });

  it('takes the alpha channel off the app icons and fails the build if one is left', () => {
    expect(codemagic).toMatch(/AppIcon\.appiconset\/\*\.png/);
    expect(codemagic).toMatch(/sips -g hasAlpha/);
    expect(codemagic.indexOf('App icons without an alpha channel')).toBeGreaterThan(codemagic.indexOf('capacitor-assets generate --ios'));
  });

  it('has the privacy manifest, icon and splash sources it copies and generates from', () => {
    const manifestXml = readFileSync('ios-config/PrivacyInfo.xcprivacy', 'utf8');
    expect(manifestXml).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/);
    expect(manifestXml).toContain('NSPrivacyAccessedAPICategoryUserDefaults');
    expect(codemagic).toContain('ios-config/PrivacyInfo.xcprivacy');
    for (const [f, size] of [['icon-only', 1024], ['icon-foreground', 1024], ['icon-background', 1024], ['splash', 2732], ['splash-dark', 2732]]) {
      const buf = readFileSync('assets/' + f + '.png');
      expect(buf.readUInt32BE(16), f + ' width').toBe(size);
      expect(buf.readUInt32BE(20), f + ' height').toBe(size);
    }
  });

  it('has the store purchase plugin and the app name and identifier the signing uses', () => {
    expect(pkg.dependencies['capacitor-plugin-cdv-purchase']).toBeTruthy();
    expect(config.appName).toBe('Language Dash');
    expect(codemagic).toContain('name: Language Dash iOS (TestFlight)');
  });

  it('the launch guide exists and names what still blocks a first build', () => {
    const guide = readFileSync('docs/IOS-LAUNCH.md', 'utf8');
    ['PathoMnemonic App Store Connect', 'LD_APPLE_IAP_PRIVATE_KEY', 'VITE_SUPABASE_ANON_KEY', 'languagedash_pro_lifetime', 'screenshots'].forEach((t) => expect(guide).toContain(t));
  });
});

