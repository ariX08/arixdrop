import JSZip from "jszip";

/**
 * If more than one file is selected, pack them into a single .zip.
 * Returns a File that can be sent over the DataChannel.
 */
export async function prepareFilesForTransfer(files: File[]): Promise<File[]> {
  if (files.length <= 1) return files;

  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file);
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const zipName = `arixdrop-${Date.now()}.zip`;
  const zipFile = new File([blob], zipName, { type: "application/zip" });

  return [zipFile];
}
