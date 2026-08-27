import "server-only";

import { inflateRawSync } from "node:zlib";

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;
const MAX_COMMENT_BYTES = 65_535;
const MAX_ENTRIES = 64;
const MAX_SKILL_BYTES = 256 * 1024;

type ZipEntry = {
  compressedSize: number;
  compressionMethod: number;
  externalAttributes: number;
  flags: number;
  localHeaderOffset: number;
  name: string;
  uncompressedSize: number;
  versionMadeBy: number;
};

function requireRange(buffer: Buffer, offset: number, length: number) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error("Skill ZIP 目录结构不完整");
  }
}

function findCentralDirectory(buffer: Buffer) {
  const minimumOffset = Math.max(0, buffer.length - 22 - MAX_COMMENT_BYTES);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) !== END_OF_CENTRAL_DIRECTORY) continue;
    requireRange(buffer, offset, 22);

    const diskNumber = buffer.readUInt16LE(offset + 4);
    const directoryDisk = buffer.readUInt16LE(offset + 6);
    const entriesOnDisk = buffer.readUInt16LE(offset + 8);
    const entryCount = buffer.readUInt16LE(offset + 10);
    const directorySize = buffer.readUInt32LE(offset + 12);
    const directoryOffset = buffer.readUInt32LE(offset + 16);
    const commentLength = buffer.readUInt16LE(offset + 20);

    if (offset + 22 + commentLength !== buffer.length) continue;
    if (diskNumber !== 0 || directoryDisk !== 0 || entriesOnDisk !== entryCount) {
      throw new Error("暂不支持分卷 Skill ZIP");
    }
    if (entryCount < 1 || entryCount > MAX_ENTRIES) throw new Error("Skill ZIP 文件数量不正确");
    if (directoryOffset === 0xffffffff || directorySize === 0xffffffff) {
      throw new Error("暂不支持 ZIP64 Skill 包");
    }
    requireRange(buffer, directoryOffset, directorySize);
    if (directoryOffset + directorySize > offset) throw new Error("Skill ZIP 中央目录越界");

    return { directoryOffset, directorySize, entryCount };
  }

  throw new Error("下载内容不是有效的 ZIP 文件");
}

function decodeEntryName(buffer: Buffer, flags: number) {
  if ((flags & 0x800) === 0 && buffer.some((byte) => byte > 0x7f)) {
    throw new Error("Skill ZIP 文件名必须使用 UTF-8 或 ASCII");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("Skill ZIP 包含无法解析的文件名");
  }
}

function validateEntryName(name: string) {
  if (!name || name.includes("\0") || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) {
    throw new Error("Skill ZIP 包含非法路径");
  }
  const segments = name.split("/");
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Skill ZIP 包含目录越界路径");
  }
}

function isSymlink(entry: ZipEntry) {
  const hostSystem = entry.versionMadeBy >>> 8;
  const unixMode = entry.externalAttributes >>> 16;
  return hostSystem === 3 && (unixMode & 0xf000) === 0xa000;
}

function readEntries(buffer: Buffer) {
  const central = findCentralDirectory(buffer);
  const directoryEnd = central.directoryOffset + central.directorySize;
  const entries: ZipEntry[] = [];
  let offset = central.directoryOffset;

  for (let index = 0; index < central.entryCount; index += 1) {
    requireRange(buffer, offset, 46);
    if (buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new Error("Skill ZIP 中央目录条目无效");
    }

    const versionMadeBy = buffer.readUInt16LE(offset + 4);
    const flags = buffer.readUInt16LE(offset + 8);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const externalAttributes = buffer.readUInt32LE(offset + 38);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const totalLength = 46 + nameLength + extraLength + commentLength;
    requireRange(buffer, offset, totalLength);

    if ([compressedSize, uncompressedSize, localHeaderOffset].includes(0xffffffff)) {
      throw new Error("暂不支持 ZIP64 Skill 条目");
    }

    const name = decodeEntryName(buffer.subarray(offset + 46, offset + 46 + nameLength), flags);
    validateEntryName(name);
    entries.push({
      compressedSize,
      compressionMethod,
      externalAttributes,
      flags,
      localHeaderOffset,
      name,
      uncompressedSize,
      versionMadeBy,
    });
    offset += totalLength;
  }

  if (offset !== directoryEnd) throw new Error("Skill ZIP 中央目录长度不一致");
  return entries;
}

function readEntry(buffer: Buffer, entry: ZipEntry) {
  if ((entry.flags & 0x1) !== 0) throw new Error("不支持加密的 Skill ZIP");
  if (![0, 8].includes(entry.compressionMethod)) throw new Error("Skill ZIP 使用了不支持的压缩格式");
  if (entry.uncompressedSize < 1 || entry.uncompressedSize > MAX_SKILL_BYTES) {
    throw new Error("SKILL.md 大小不正确");
  }
  if (entry.compressedSize > MAX_SKILL_BYTES) throw new Error("SKILL.md 压缩数据过大");
  if (isSymlink(entry)) throw new Error("SKILL.md 不能是软链接");

  requireRange(buffer, entry.localHeaderOffset, 30);
  if (buffer.readUInt32LE(entry.localHeaderOffset) !== LOCAL_FILE_HEADER) {
    throw new Error("SKILL.md 本地文件头无效");
  }

  const localFlags = buffer.readUInt16LE(entry.localHeaderOffset + 6);
  const localMethod = buffer.readUInt16LE(entry.localHeaderOffset + 8);
  const nameLength = buffer.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLength = buffer.readUInt16LE(entry.localHeaderOffset + 28);
  if ((localFlags & 0x1) !== 0 || localMethod !== entry.compressionMethod) {
    throw new Error("SKILL.md 压缩信息不一致");
  }
  requireRange(buffer, entry.localHeaderOffset + 30, nameLength);
  const localName = decodeEntryName(
    buffer.subarray(entry.localHeaderOffset + 30, entry.localHeaderOffset + 30 + nameLength),
    localFlags,
  );
  validateEntryName(localName);
  if (localName !== entry.name) throw new Error("SKILL.md 文件名信息不一致");

  const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
  requireRange(buffer, dataOffset, entry.compressedSize);
  const compressed = buffer.subarray(dataOffset, dataOffset + entry.compressedSize);
  const output = entry.compressionMethod === 0
    ? Buffer.from(compressed)
    : inflateRawSync(compressed, { maxOutputLength: MAX_SKILL_BYTES });
  if (output.length !== entry.uncompressedSize) throw new Error("SKILL.md 解压长度不一致");

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(output);
  } catch {
    throw new Error("SKILL.md 必须是 UTF-8 文本");
  }
}

export function extractSkillMarkdownFromZip(zipBytes: Uint8Array, identifier: string) {
  const buffer = Buffer.from(zipBytes);
  const entries = readEntries(buffer);
  const matches = entries.filter((entry) => {
    const segments = entry.name.split("/");
    if (segments.some((segment) => segment.startsWith(".") || segment === "__MACOSX")) return false;
    return entry.name === "SKILL.md" || (segments.length === 2 && segments[1] === "SKILL.md");
  });
  if (matches.length !== 1) {
    throw new Error(`Skill ZIP 必须且只能包含一个可识别的 SKILL.md（${identifier}）`);
  }
  return readEntry(buffer, matches[0]);
}
