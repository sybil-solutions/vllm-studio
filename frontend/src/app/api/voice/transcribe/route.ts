import { NextRequest, NextResponse } from "next/server";
import { getApiSettings } from "@/lib/api-settings";

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const settings = await getApiSettings();
    const voiceUrl = settings.voiceUrl;

    if (!voiceUrl) {
      return NextResponse.json({ error: "Voice URL not configured" }, { status: 400 });
    }

    if (settings.voiceModel) {
      formData.set("model", settings.voiceModel);
    }

    // Build headers with API key
    const headers: HeadersInit = {};

    // Use incoming auth or fallback to server API key
    const incomingAuth = request.headers.get("authorization");
    if (incomingAuth) {
      headers["Authorization"] = incomingAuth;
    } else if (settings.apiKey) {
      headers["Authorization"] = `Bearer ${settings.apiKey}`;
    }

    // Forward to voice transcription service
    const response = await fetch(`${voiceUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Transcription failed", details: errorText },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[VOICE PROXY ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}
