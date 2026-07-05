type ImageCompressionOptions = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  outputType?: "image/webp" | "image/jpeg";
  fileName?: string;
};

function getImageDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Safari can decode some photo-library formats through <img> but not ImageBitmap.
    }
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("No pudimos leer el formato de esta imagen."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return image;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No pudimos preparar la imagen para subirla."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

export async function compressImage(
  file: File,
  {
    maxWidth,
    maxHeight,
    quality,
    outputType = "image/webp",
    fileName = `${crypto.randomUUID()}.webp`
  }: ImageCompressionOptions
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Seleccioná un archivo de imagen.");
  }

  const image = await loadImage(file);

  try {
    const { width, height } = getImageDimensions(
      image.width,
      image.height,
      maxWidth,
      maxHeight
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Este navegador no permite preparar la imagen.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, outputType, quality);

    return new File([blob], fileName, {
      type: blob.type || outputType,
      lastModified: Date.now()
    });
  } finally {
    if ("close" in image && typeof image.close === "function") {
      image.close();
    }
  }
}
