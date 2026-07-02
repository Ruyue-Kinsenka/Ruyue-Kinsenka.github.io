import fs from "node:fs";
import path from "node:path";

export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  lyrics: string[];
}

export interface MusicData {
  tracks: Track[];
}

export function getMusicData(): MusicData {
  const filePath = path.resolve("public/music/tracks.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as MusicData;
}

export function getCoverPath(coverFileName: string): string {
  return `/music/covers/${coverFileName}`;
}
