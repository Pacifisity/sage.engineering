import { getToken } from "./googleAuth.js";

const FILE_NAME = "flow-tasks.json";

async function findFileId() {
  const token = getToken();
  const query = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,name)&q=${query}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Unable to list files");
  }
  const data = await response.json();
  return data.files && data.files.length ? data.files[0].id : null;
}

async function uploadContent(content) {
  const token = getToken();
  const fileId = await findFileId();

  const metadata = fileId
    ? { name: FILE_NAME }
    : { name: FILE_NAME, parents: ["appDataFolder"] };

  const boundary = `flow_${Date.now()}`;
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${content}\r\n` +
    `--${boundary}--`;

  const uploadUrl = fileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
    : "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

  const response = await fetch(uploadUrl, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DRIVE] Upload failed:", response.status, response.statusText);
    console.error("[DRIVE] Error response:", errorText);
    throw new Error(
      `Unable to save file: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
}

export async function saveFile(payload) {
  const token = getToken();
  if (!token) {
    console.error("[DRIVE] No access token");
    throw new Error("Not authenticated");
  }

  console.log("[DRIVE] saveFile - payload has", payload.length, "tasks");

  try {
    await uploadContent(JSON.stringify(payload, null, 2));
    console.log("[DRIVE] Save successful");
    return true;
  } catch (error) {
    console.error("[DRIVE] Save failed:", error);
    console.error("[DRIVE] Error message:", error.message);
    console.error("[DRIVE] Error stack:", error.stack);
    throw error;
  }
}

export async function loadFile() {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const fileId = await findFileId();
    if (!fileId) {
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      throw new Error("Unable to load file");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[DRIVE] Load failed:", error);
    throw error;
  }
}
