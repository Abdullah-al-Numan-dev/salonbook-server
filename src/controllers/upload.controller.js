import { HttpError } from "../utils/httpError.js";

// POST /api/upload/image
export async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      throw new HttpError(400, "No image provided. Send the file in the 'image' field");
    }

    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) throw new Error("IMGBB_API_KEY is not set");

    const form = new FormData();
    form.append("image", req.file.buffer.toString("base64"));

    let json = null;
    try {
      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
        { method: "POST", body: form, signal: AbortSignal.timeout(20000) }
      );
      json = await response.json();
      if (!response.ok || !json?.success) json = null;
    } catch (err) {
      console.error("ImgBB request failed:", err.message);
    }

    if (!json) {
      throw new HttpError(502, "Image upload failed. Please try again");
    }

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: { url: json.data.display_url || json.data.url },
    });
  } catch (err) {
    next(err);
  }
}