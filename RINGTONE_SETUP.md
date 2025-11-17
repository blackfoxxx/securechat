# Ringtone Setup Guide

The incoming call notification system includes audio ringtone support. Follow these steps to add a ringtone to your deployment.

## Quick Setup

1. **Get a Ringtone File**
   - Download a free ringtone from:
     - [Freesound](https://freesound.org/) (search for "phone ring" or "call tone")
     - [Zapsplat](https://zapsplat.com/sound-effect-category/phone-ringtones/)
     - [Pixabay](https://pixabay.com/sound-effects/search/ringtone/)
   - Or create your own using [BeepBox](https://www.beepbox.co/)

2. **Convert to MP3** (if needed)
   - Use [Online Audio Converter](https://online-audio-converter.com/)
   - Or use `ffmpeg`:
     ```bash
     ffmpeg -i your-ringtone.wav -codec:a libmp3lame -b:a 128k ringtone.mp3
     ```

3. **Add to Project**
   ```bash
   # Place the MP3 file in the public directory
   cp your-ringtone.mp3 client/public/ringtone.mp3
   ```

4. **Verify**
   - The file must be named exactly `ringtone.mp3`
   - It must be in `client/public/` directory
   - Recommended: 3-5 seconds long, loops automatically

## Without Ringtone

The call notification system works without a ringtone file. Users will see the incoming call modal but won't hear audio. The browser console will show a warning about the missing audio file.

## Recommended Ringtone Specifications

- **Format**: MP3
- **Duration**: 3-5 seconds (it loops automatically)
- **Bitrate**: 128 kbps
- **Sample Rate**: 44.1 kHz
- **File Size**: < 100 KB

## Example Free Ringtones

Here are some direct links to free, commercial-use ringtones:

1. **Classic Phone Ring**
   - https://freesound.org/people/InspectorJ/sounds/484344/
   - License: CC BY 4.0

2. **Modern Ringtone**
   - https://freesound.org/people/plasterbrain/sounds/397355/
   - License: CC0 (Public Domain)

3. **Simple Beep**
   - https://freesound.org/people/Bertrof/sounds/351565/
   - License: CC0 (Public Domain)

## Custom Ringtone

To create a custom ringtone:

1. Visit [BeepBox](https://www.beepbox.co/)
2. Create a simple melody (3-5 seconds)
3. Export as WAV
4. Convert to MP3
5. Place in `client/public/ringtone.mp3`

## Troubleshooting

**Ringtone doesn't play:**
- Check browser console for errors
- Ensure file is named `ringtone.mp3` (case-sensitive)
- Verify file is in `client/public/` directory
- Check browser autoplay policy (some browsers block audio until user interaction)

**Audio quality issues:**
- Use 128 kbps bitrate
- Keep file size under 100 KB
- Ensure sample rate is 44.1 kHz

## M2M Network Deployment

For offline M2M deployments:
1. Add ringtone file before building the application
2. The file will be bundled with the static assets
3. No internet connection needed for ringtone to work
