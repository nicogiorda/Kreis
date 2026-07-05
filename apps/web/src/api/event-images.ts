import { supabaseBrowser } from "../lib/supabase-browser";
import { compressImage } from "../utils/image-compression";

const eventImagesBucket = "event-images";
export async function compressEventImage(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 1280,
    maxHeight: 720,
    quality: 0.75
  });
}

export async function uploadEventImage(file: File, _accessToken: string): Promise<string> {
  const optimizedImage = await compressEventImage(file);
  const path = `events/${optimizedImage.name}`;
  const { error } = await supabaseBrowser.storage
    .from(eventImagesBucket)
    .upload(path, optimizedImage, {
      cacheControl: "31536000",
      contentType: optimizedImage.type,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseBrowser.storage.from(eventImagesBucket).getPublicUrl(path);

  return data.publicUrl;
}
