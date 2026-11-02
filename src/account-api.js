import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { authenticatedFetch } from "./api-client";

// Photos are stored small: the server accepts up to 2 MB, a 512 px JPEG is far below that.
const PROFILE_PHOTO_SIZE = 512;

async function readUserResponse(response, fallbackMessage) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.user) throw new Error(result.error || fallbackMessage);
  return result.user;
}

export async function updateMyAccount({ name, phone }) {
  const response = await authenticatedFetch("/account", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, phone }),
  });
  return readUserResponse(response, "Unable to save account changes.");
}

async function resizeForUpload(asset) {
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    const width = Number(asset.width) || 0;
    const height = Number(asset.height) || 0;
    // Resize the longer side only, so a slightly non-square crop is never stretched.
    if (width > PROFILE_PHOTO_SIZE || height > PROFILE_PHOTO_SIZE || !width || !height) {
      context.resize(width >= height ? { width: PROFILE_PHOTO_SIZE } : { height: PROFILE_PHOTO_SIZE });
    }
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

// Opens the system photo picker (no storage permission needed), crops to a square,
// and uploads a small JPEG. Returns the updated user, or null when the user cancels.
export async function pickAndUploadProfilePhoto() {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  const asset = picked.canceled ? null : picked.assets?.[0];
  if (!asset?.uri) return null;

  let resized;
  try {
    resized = await resizeForUpload(asset);
  } catch {
    throw new Error("This photo could not be read. Please choose a different one.");
  }
  const photoFile = new File(resized.uri);
  try {
    // Expo's fetch only accepts real file objects in FormData, not React Native's { uri, name, type }.
    const form = new FormData();
    form.append("photo", photoFile);
    const response = await authenticatedFetch("/account/photo", { method: "PUT", body: form });
    return await readUserResponse(response, "Unable to update your profile photo.");
  } finally {
    try { photoFile.delete(); } catch {}
  }
}

export async function removeProfilePhoto() {
  const response = await authenticatedFetch("/account/photo", { method: "DELETE" });
  return readUserResponse(response, "Unable to remove your profile photo.");
}
