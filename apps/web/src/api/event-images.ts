import { createClient } from "@supabase/supabase-js";

const eventImagesBucket = "event-images";
const maxImageWidth = 1280;
const maxImageHeight = 720;
const imageQuality = 0.75;

function getSupabaseWebClient(accessToken: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase web env vars are missing");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

function getImageDimensions(width: number, height: number) {
  const scale = Math.min(maxImageWidth / width, maxImageHeight / height, 1);

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale)
  };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No pudimos leer la imagen."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return image;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No pudimos comprimir la imagen."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

export async function compressEventImage(file: File): Promise<File> {
  const image = await loadImage(file);
  const sourceWidth = image.width;
  const sourceHeight = image.height;
  const { width, height } = getImageDimensions(sourceWidth, sourceHeight);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("El navegador no permite comprimir imagenes.");
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const blob = await canvasToBlob(canvas, "image/webp", imageQuality);

  if ("close" in image && typeof image.close === "function") {
    image.close();
  }

  return new File([blob], `${crypto.randomUUID()}.webp`, { type: "image/webp" });
}

export async function uploadEventImage(file: File, accessToken: string): Promise<string> {
  const optimizedImage = await compressEventImage(file);
  const path = `events/${optimizedImage.name}`;
  const supabase = getSupabaseWebClient(accessToken);
  const { error } = await supabase.storage
    .from(eventImagesBucket)
    .upload(path, optimizedImage, {
      cacheControl: "31536000",
      contentType: optimizedImage.type,
      upsert: false
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(eventImagesBucket).getPublicUrl(path);

  return data.publicUrl;
}
