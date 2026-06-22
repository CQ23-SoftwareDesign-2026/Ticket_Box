import { tokenStorage } from "@/utils/token.utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/proxy";

export async function uploadImage(file: File): Promise<{ url: string }> {
  const token = tokenStorage.getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  // DO NOT set Content-Type, fetch will set it to multipart/form-data with the correct boundary

  const response = await fetch(`${API_BASE_URL}/uploads/image`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to upload image: ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json();
}

export async function uploadSvg(file: File): Promise<{ url: string }> {
  const token = tokenStorage.getAccessToken();
  const formData = new FormData();
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/uploads/svg`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to upload SVG map: ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json();
}
