import "server-only";
import { Binary } from "mongodb";
import type { Profile, ProfileAvatar } from "@/types/profile";

export const PROFILES_COLLECTION = "profiles";

/**
 * How the account holder's profile is stored.
 *
 * One document per account, keyed by the login username. The app currently has
 * exactly one account, but keying on the username rather than a singleton
 * document means nothing here has to change if that stops being true.
 *
 * The avatar bytes live inline as BSON binary rather than in GridFS: an avatar
 * is capped at 2MB by `AVATAR_MAX_BYTES` and in practice lands around 40KB, so
 * it fits a document comfortably and reads back in one round trip. GridFS would
 * buy chunking that nothing here needs.
 */
export type ProfileDocument = {
  username: string;
  displayName: string | null;
  avatar: StoredAvatar | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredAvatar = {
  data: Binary;
  /** Mime type of `data`, so the route can serve it without sniffing. */
  contentType: string;
  /** Byte length, kept alongside so metadata reads never load the binary. */
  size: number;
  /** When these bytes were uploaded; the cache key for the avatar URL. */
  updatedAt: Date;
};

/**
 * The projection used everywhere except the avatar route.
 *
 * Excluding `avatar.data` is the point: a header render needs to know an avatar
 * exists, not to pull its bytes through the driver and the RSC stream on every
 * page load.
 */
export const PROFILE_METADATA_PROJECTION = {
  "avatar.data": 0,
} as const;

/** A document read without its avatar bytes. */
export type ProfileMetadataDocument = Omit<ProfileDocument, "avatar"> & {
  avatar: Omit<StoredAvatar, "data"> | null;
};

/**
 * Stored document -> the shape the rest of the app consumes.
 *
 * `_id` is not part of the profile: a profile is identified by its username,
 * and nothing outside this module has any use for the document id.
 */
export function toProfile(document: ProfileMetadataDocument): Profile {
  return {
    username: document.username,
    displayName: document.displayName,
    avatar: document.avatar
      ? {
          contentType: document.avatar.contentType,
          size: document.avatar.size,
          updatedAt: document.avatar.updatedAt.toISOString(),
        }
      : null,
  };
}

/** The profile of an account that has never saved one. */
export function emptyProfile(username: string): Profile {
  return { username, displayName: null, avatar: null };
}

/** Uploaded bytes -> the stored sub-document. */
export function toStoredAvatar(
  bytes: Uint8Array,
  contentType: string,
): StoredAvatar {
  return {
    data: new Binary(bytes),
    contentType,
    size: bytes.byteLength,
    updatedAt: new Date(),
  };
}

/** Stored sub-document -> the bytes the avatar route serves. */
export function toProfileAvatar(stored: StoredAvatar): ProfileAvatar {
  return {
    // Copied out of the driver's buffer. That detaches the bytes from a pooled
    // allocation the driver may reuse, and gives a plain `ArrayBuffer`-backed
    // view, which is what a `Response` body will accept.
    data: new Uint8Array(stored.data.buffer),
    contentType: stored.contentType,
    size: stored.size,
    updatedAt: stored.updatedAt.toISOString(),
  };
}
