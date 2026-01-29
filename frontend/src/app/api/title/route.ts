import { NextRequest, NextResponse } from "next/server";

/**
 * Generate a simple title from the first few words of the user's message
 */
function generateTitle(userMessage: string): string {
  if (!userMessage || !userMessage.trim()) {
    return "New Chat";
  }

  // Clean and split into words
  const cleaned = userMessage
    .replace(/\n/g, " ")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((w) => w.length > 0);

  // Take first 3-5 words
  const titleWords = words.slice(0, 5);

  if (titleWords.length === 0) {
    return "New Chat";
  }

  // Capitalize first word, keep rest as-is
  const title = titleWords
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

  // Truncate if too long
  return title.length > 50 ? title.slice(0, 47) + "..." : title;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const user = typeof body?.user === "string" ? body.user : "";

    const title = generateTitle(user);

    return NextResponse.json({ title });
  } catch (error) {
    console.error("Title generation error:", error);
    return NextResponse.json({ title: "New Chat" });
  }
}
