import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { getFFmpegPath } from './ffmpegPath';

export interface ExtractedVideoMetadata {
  file_size: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  frame_rate: number | null;
}

/**
 * Extract metadata for MP4, MOV, WebM, MKV, AVI, WMV files.
 */
export async function extractVideoMetadata(filePath: string): Promise<ExtractedVideoMetadata | null> {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();

    let meta: { duration?: number; width?: number; height?: number; frameRate?: number } | null = null;

    if (ext === '.webm' || ext === '.mkv') {
      meta = extractWebmMetadataNative(filePath, fileSize);
    } else if (ext === '.avi') {
      meta = extractAviMetadataNative(filePath);
    }

    // Fallback or default to MP4/MOV parser
    if (!meta || (!meta.frameRate && ext !== '.webm' && ext !== '.mkv' && ext !== '.avi')) {
      const mp4Meta = extractMp4MetadataNative(filePath, fileSize);
      if (mp4Meta) {
        meta = {
          duration: mp4Meta.duration ?? meta?.duration,
          width: mp4Meta.width ?? meta?.width,
          height: mp4Meta.height ?? meta?.height,
          frameRate: mp4Meta.frameRate ?? meta?.frameRate,
        };
      }
    }

    // If native parser did not return duration or resolution (e.g. WMV files), try FFmpeg fallback
    if (!meta || !meta.duration || !meta.width) {
      const ffmpegMeta = await extractMetadataWithFFmpeg(filePath);
      if (ffmpegMeta) {
        meta = {
          duration: meta?.duration ?? ffmpegMeta.duration,
          width: meta?.width ?? ffmpegMeta.width,
          height: meta?.height ?? ffmpegMeta.height,
          frameRate: meta?.frameRate ?? ffmpegMeta.frameRate,
        };
      }
    }

    return {
      file_size: fileSize,
      duration: meta?.duration ?? null,
      width: meta?.width ?? null,
      height: meta?.height ?? null,
      frame_rate: meta?.frameRate ?? null,
    };
  } catch (err) {
    console.error('Failed to extract video metadata:', err);
    return null;
  }
}

/**
 * Extract metadata via FFmpeg CLI fallback (supports WMV, ASF, FLV, MPG, TS, etc.)
 */
export async function extractMetadataWithFFmpeg(filePath: string): Promise<{ duration?: number; width?: number; height?: number; frameRate?: number } | null> {
  return new Promise((resolve) => {
    execFile(
      getFFmpegPath(),
      ['-hide_banner', '-i', filePath],
      {
        encoding: 'utf8',
        timeout: 8000,
      },
      (err, _stdout, stderr) => {
        const output = (stderr || '') + (_stdout || '') + (err?.message || '');
        if (!output) {
          resolve(null);
          return;
        }

        let duration: number | undefined;
        let width: number | undefined;
        let height: number | undefined;
        let frameRate: number | undefined;

        const durMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
        if (durMatch) {
          const h = parseFloat(durMatch[1]);
          const m = parseFloat(durMatch[2]);
          const s = parseFloat(durMatch[3]);
          duration = Math.round((h * 3600 + m * 60 + s) * 100) / 100;
        }

        const streamMatch = output.match(/Stream #\d+:\d+.*?: Video:.*? (\d{2,5})x(\d{2,5})/);
        if (streamMatch) {
          width = parseInt(streamMatch[1], 10);
          height = parseInt(streamMatch[2], 10);
        }

        const fpsMatch = output.match(/(\d+(?:\.\d+)?)\s*fps/);
        if (fpsMatch) {
          frameRate = Math.round(parseFloat(fpsMatch[1]) * 100) / 100;
        }

        if (duration || width || height) {
          resolve({ duration, width, height, frameRate });
        } else {
          resolve(null);
        }
      }
    );
  });
}

/**
 * Parse MP4 / MOV container (supports faststart and non-faststart moov at end of file)
 */
function extractMp4MetadataNative(filePath: string, fileSize: number): { duration?: number; width?: number; height?: number; frameRate?: number } | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');

    let moovBuf: Buffer | null = null;
    let moovStartOffset = 0;

    // 1. Scan top-level boxes starting from beginning
    let pos = 0;
    const headerBuf = Buffer.alloc(16);

    while (pos + 8 <= fileSize) {
      const bytesRead = fs.readSync(fd, headerBuf, 0, 8, pos);
      if (bytesRead < 8) break;

      const size32 = headerBuf.readUInt32BE(0);
      const type = headerBuf.toString('ascii', 4, 8);

      let boxSize = BigInt(size32);
      let headerLen = 8;

      if (size32 === 1) {
        const read64 = fs.readSync(fd, headerBuf, 8, 8, pos + 8);
        if (read64 < 8) break;
        boxSize = headerBuf.readBigUInt64BE(8);
        headerLen = 16;
      } else if (size32 === 0) {
        boxSize = BigInt(fileSize - pos);
      }

      if (type === 'moov') {
        const moovLen = Number(boxSize);
        if (moovLen > 0 && moovLen <= 64 * 1024 * 1024) {
          moovBuf = Buffer.alloc(moovLen);
          fs.readSync(fd, moovBuf, 0, moovLen, pos);
          moovStartOffset = pos;
        }
        break;
      }

      if (boxSize <= BigInt(0)) break;
      pos += Number(boxSize);
    }

    // 2. If moov not found near start, check end of file (non-faststart MP4s)
    if (!moovBuf && fileSize > 8) {
      const searchSize = Math.min(fileSize, 16 * 1024 * 1024); // search last 16MB
      const tailBuf = Buffer.alloc(searchSize);
      const startReadPos = fileSize - searchSize;
      fs.readSync(fd, tailBuf, 0, searchSize, startReadPos);

      // Search for 'moov' ASCII bytes (0x6D 0x6F 0x6F 0x76)
      for (let i = tailBuf.length - 4; i >= 0; i--) {
        if (
          tailBuf[i] === 0x6d &&
          tailBuf[i + 1] === 0x6f &&
          tailBuf[i + 2] === 0x6f &&
          tailBuf[i + 3] === 0x76
        ) {
          // Found 'moov' tag at index i (type offset). Size is 4 bytes before i.
          if (i >= 4) {
            const moovSize32 = tailBuf.readUInt32BE(i - 4);
            const absoluteMoovPos = startReadPos + (i - 4);
            if (moovSize32 > 0 && absoluteMoovPos + moovSize32 <= fileSize) {
              moovBuf = Buffer.alloc(moovSize32);
              fs.readSync(fd, moovBuf, 0, moovSize32, absoluteMoovPos);
              moovStartOffset = absoluteMoovPos;
              break;
            }
          }
        }
      }
    }

    fs.closeSync(fd);
    fd = null;

    if (!moovBuf) return null;

    // 3. Parse moov atom buffer
    let mvhdTimescale = 0;
    let mvhdDuration = 0;

    let videoWidth = 0;
    let videoHeight = 0;
    let videoTimescale = 0;
    let videoDuration = 0;
    let videoSampleCount = 0;

    function parseBoxes(buf: Buffer, start: number, end: number) {
      let curr = start;
      while (curr + 8 <= end) {
        const size32 = buf.readUInt32BE(curr);
        const type = buf.toString('ascii', curr + 4, curr + 8);
        let boxSize = size32 === 1 ? Number(buf.readBigUInt64BE(curr + 8)) : size32;
        let headerLen = size32 === 1 ? 16 : 8;

        if (size32 === 0 || curr + boxSize > end) {
          boxSize = end - curr;
        }

        const contentStart = curr + headerLen;
        const contentEnd = curr + boxSize;

        if (type === 'mvhd') {
          const version = buf.readUInt8(contentStart);
          if (version === 1) {
            mvhdTimescale = buf.readUInt32BE(contentStart + 20);
            mvhdDuration = Number(buf.readBigUInt64BE(contentStart + 24));
          } else {
            mvhdTimescale = buf.readUInt32BE(contentStart + 12);
            mvhdDuration = buf.readUInt32BE(contentStart + 16);
          }
        } else if (type === 'trak') {
          parseTrak(buf, contentStart, contentEnd);
        } else if (type === 'moov' || type === 'mdia' || type === 'minf' || type === 'stbl') {
          parseBoxes(buf, contentStart, contentEnd);
        }

        curr += boxSize;
        if (boxSize <= 0) break;
      }
    }

    function parseTrak(buf: Buffer, start: number, end: number) {
      let isVideoTrack = false;
      let width = 0;
      let height = 0;
      let timescale = 0;
      let duration = 0;
      let sampleCount = 0;

      function scanTrakNodes(curr: number, stop: number) {
        while (curr + 8 <= stop) {
          const size32 = buf.readUInt32BE(curr);
          const type = buf.toString('ascii', curr + 4, curr + 8);
          let boxSize = size32 === 1 ? Number(buf.readBigUInt64BE(curr + 8)) : size32;
          let headerLen = size32 === 1 ? 16 : 8;
          if (size32 === 0 || curr + boxSize > stop) boxSize = stop - curr;

          const contentStart = curr + headerLen;
          const contentEnd = curr + boxSize;

          if (type === 'hdlr') {
            if (contentStart + 12 <= contentEnd) {
              const handlerType = buf.toString('ascii', contentStart + 8, contentStart + 12);
              if (handlerType === 'vide') {
                isVideoTrack = true;
              }
            }
          } else if (type === 'tkhd') {
            const version = buf.readUInt8(contentStart);
            const widthOffset = version === 1 ? 84 : 76;
            if (contentStart + widthOffset + 8 <= contentEnd) {
              width = buf.readUInt32BE(contentStart + widthOffset) >> 16;
              height = buf.readUInt32BE(contentStart + widthOffset + 4) >> 16;
            }
          } else if (type === 'mdhd') {
            const version = buf.readUInt8(contentStart);
            if (version === 1) {
              timescale = buf.readUInt32BE(contentStart + 20);
              duration = Number(buf.readBigUInt64BE(contentStart + 24));
            } else {
              timescale = buf.readUInt32BE(contentStart + 12);
              duration = buf.readUInt32BE(contentStart + 16);
            }
          } else if (type === 'stsz') {
            if (contentStart + 8 <= contentEnd) {
              const count = buf.readUInt32BE(contentStart + 4);
              if (count > 0) sampleCount = count;
            }
          } else if (type === 'stts') {
            if (sampleCount === 0 && contentStart + 8 <= contentEnd) {
              const entryCount = buf.readUInt32BE(contentStart + 4);
              let total = 0;
              let entryPos = contentStart + 8;
              for (let i = 0; i < entryCount && entryPos + 8 <= contentEnd; i++) {
                total += buf.readUInt32BE(entryPos);
                entryPos += 8;
              }
              if (total > 0) sampleCount = total;
            }
          } else if (type === 'mdia' || type === 'minf' || type === 'stbl') {
            scanTrakNodes(contentStart, contentEnd);
          }

          curr += boxSize;
          if (boxSize <= 0) break;
        }
      }

      scanTrakNodes(start, end);

      if (isVideoTrack || (width > 0 && height > 0 && videoWidth === 0)) {
        if (width > 0) videoWidth = width;
        if (height > 0) videoHeight = height;
        if (timescale > 0) videoTimescale = timescale;
        if (duration > 0) videoDuration = duration;
        if (sampleCount > 0) videoSampleCount = sampleCount;
      }
    }

    parseBoxes(moovBuf, 0, moovBuf.length);

    // Calculate final metrics
    let finalDuration: number | undefined;
    if (videoTimescale > 0 && videoDuration > 0) {
      finalDuration = videoDuration / videoTimescale;
    } else if (mvhdTimescale > 0 && mvhdDuration > 0) {
      finalDuration = mvhdDuration / mvhdTimescale;
    }

    let frameRate: number | undefined;
    if (finalDuration && finalDuration > 0 && videoSampleCount > 0) {
      frameRate = Math.round((videoSampleCount / finalDuration) * 100) / 100;
    }

    return {
      duration: finalDuration ? Math.round(finalDuration * 100) / 100 : undefined,
      width: videoWidth || undefined,
      height: videoHeight || undefined,
      frameRate,
    };
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
    return null;
  }
}

/**
 * WebM / MKV (Matroska) EBML parser
 */
function extractWebmMetadataNative(filePath: string, fileSize: number): { duration?: number; width?: number; height?: number; frameRate?: number } | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const readSize = Math.min(fileSize, 4 * 1024 * 1024); // Read up to 4MB
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, 0);
    fs.closeSync(fd);
    fd = null;

    function readVint(p: number): { value: number; length: number } | null {
      if (p >= buf.length) return null;
      const b0 = buf[p];
      let mask = 0x80;
      let length = 1;
      while (length <= 8 && (b0 & mask) === 0) {
        mask >>= 1;
        length++;
      }
      if (length > 8) return null;

      let val = b0 & (mask - 1);
      for (let i = 1; i < length; i++) {
        if (p + i >= buf.length) return null;
        val = (val * 256) + buf[p + i];
      }
      return { value: val, length };
    }

    function readElementHeader(p: number): { id: number; idLen: number; dataLen: number; headerLen: number } | null {
      if (p >= buf.length) return null;
      let idLen = 1;
      const b0 = buf[p];
      if ((b0 & 0x80) !== 0) idLen = 1;
      else if ((b0 & 0x40) !== 0) idLen = 2;
      else if ((b0 & 0x20) !== 0) idLen = 3;
      else if ((b0 & 0x10) !== 0) idLen = 4;
      else return null;

      if (p + idLen > buf.length) return null;
      let id = 0;
      for (let i = 0; i < idLen; i++) {
        id = (id * 256) + buf[p + i];
      }

      const vint = readVint(p + idLen);
      if (!vint) return null;

      return {
        id,
        idLen,
        dataLen: vint.value,
        headerLen: idLen + vint.length,
      };
    }

    let defaultDurationNs: number | undefined;
    let width: number | undefined;
    let height: number | undefined;

    function parseEbml(start: number, end: number) {
      let p = start;
      while (p < end) {
        const header = readElementHeader(p);
        if (!header) break;

        const elemEnd = p + header.headerLen + header.dataLen;

        // EBML element IDs:
        // 0x18538067: Segment
        // 0x1654AE6B: Tracks
        // 0xAE: TrackEntry
        // 0xE0: Video Settings
        if (
          header.id === 0x18538067 ||
          header.id === 0x1654AE6B ||
          header.id === 0xAE ||
          header.id === 0xE0
        ) {
          parseEbml(p + header.headerLen, Math.min(elemEnd, end));
        } else if (header.id === 0x23E383) {
          // DefaultDuration (nanoseconds per frame)
          const dataStart = p + header.headerLen;
          if (header.dataLen === 4 && dataStart + 4 <= buf.length) {
            defaultDurationNs = buf.readUInt32BE(dataStart);
          } else if (header.dataLen === 8 && dataStart + 8 <= buf.length) {
            defaultDurationNs = Number(buf.readBigUInt64BE(dataStart));
          }
        } else if (header.id === 0xB0) {
          // PixelWidth
          const dataStart = p + header.headerLen;
          if (header.dataLen === 2 && dataStart + 2 <= buf.length) width = buf.readUInt16BE(dataStart);
          else if (header.dataLen === 4 && dataStart + 4 <= buf.length) width = buf.readUInt32BE(dataStart);
        } else if (header.id === 0xBA) {
          // PixelHeight
          const dataStart = p + header.headerLen;
          if (header.dataLen === 2 && dataStart + 2 <= buf.length) height = buf.readUInt16BE(dataStart);
          else if (header.dataLen === 4 && dataStart + 4 <= buf.length) height = buf.readUInt32BE(dataStart);
        }

        p = elemEnd;
      }
    }

    parseEbml(0, buf.length);

    let frameRate: number | undefined;
    if (defaultDurationNs && defaultDurationNs > 0) {
      frameRate = Math.round((1_000_000_000 / defaultDurationNs) * 100) / 100;
    }

    return {
      width,
      height,
      frameRate,
    };
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
    return null;
  }
}

/**
 * AVI RIFF parser
 */
function extractAviMetadataNative(filePath: string): { duration?: number; width?: number; height?: number; frameRate?: number } | null {
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(64 * 1024); // 64KB header
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    fd = null;

    if (bytesRead < 56) return null;

    const riffType = buf.toString('ascii', 0, 4);
    const aviType = buf.toString('ascii', 8, 12);
    if (riffType !== 'RIFF' || aviType !== 'AVI ') return null;

    let microSecPerFrame = 0;
    let totalFrames = 0;
    let width = 0;
    let height = 0;

    // Scan for 'avih' chunk
    for (let i = 12; i < bytesRead - 40; i++) {
      if (buf.toString('ascii', i, i + 4) === 'avih') {
        const content = i + 8;
        microSecPerFrame = buf.readUInt32LE(content);
        totalFrames = buf.readUInt32LE(content + 16);
        width = buf.readUInt32LE(content + 32);
        height = buf.readUInt32LE(content + 36);
        break;
      }
    }

    let frameRate: number | undefined;
    if (microSecPerFrame > 0) {
      frameRate = Math.round((1_000_000 / microSecPerFrame) * 100) / 100;
    }

    let duration: number | undefined;
    if (frameRate && totalFrames > 0) {
      duration = Math.round((totalFrames / frameRate) * 100) / 100;
    }

    return {
      duration,
      width: width || undefined,
      height: height || undefined,
      frameRate,
    };
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
    return null;
  }
}
