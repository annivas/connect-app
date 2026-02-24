import Constants from 'expo-constants';
import type { SongMetadata } from '../types';

const CLIENT_ID = Constants.expoConfig?.extra?.spotifyClientId ?? '';
const CLIENT_SECRET = Constants.expoConfig?.extra?.spotifyClientSecret ?? '';

// ─── Token cache ─────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

// ─── Spotify API response types ──────────────
interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

// ─── Public API ──────────────────────────────

export function isConfigured(): boolean {
  return CLIENT_ID.length > 0 && CLIENT_SECRET.length > 0;
}

export async function searchTracks(query: string): Promise<SongMetadata[]> {
  const token = await getAccessToken();

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Spotify search failed: ${res.status}`);
  }

  const data = await res.json();
  const tracks: SpotifyTrack[] = data.tracks?.items ?? [];

  return tracks.map((track) => ({
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumArt:
      track.album.images.find((img) => img.width === 300)?.url ??
      track.album.images[0]?.url ??
      '',
    duration: Math.round(track.duration_ms / 1000),
    spotifyUrl: track.external_urls.spotify,
    previewUrl: track.preview_url ?? undefined,
  }));
}
