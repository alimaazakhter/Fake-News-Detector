import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return Response.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      next: { revalidate: 3600 }, // cache for 1 hour
    });

    if (!response.ok) {
      return Response.json(
        { error: `Failed to fetch URL. Server responded with status ${response.status}.` },
        { status: 400 }
      );
    }

    const html = await response.text();

    // Pre-process HTML tags to ensure spaces between elements (prevents concatenation)
    const spacedHtml = html
      .replace(/<\/p>/gi, "</p> ")
      .replace(/<\/div>/gi, "</div> ")
      .replace(/<\/li>/gi, "</li> ")
      .replace(/<\/span>/gi, "</span> ")
      .replace(/<\/a>/gi, "</a> ")
      .replace(/<\/td>/gi, "</td> ")
      .replace(/<\/th>/gi, "</th> ")
      .replace(/<\/h[1-6]>/gi, (match) => `${match} `)
      .replace(/<br\s*\/?>/gi, "<br /> ");

    // LinkeDOM server-side DOM creation
    const { document } = parseHTML(spacedHtml);

    // Run Readability algorithm
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      // Fallback: extract raw text from body
      const bodyText = document.body ? document.body.textContent || "" : "";
      const cleanedFallback = bodyText.replace(/\s+/g, " ").trim();
      
      if (!cleanedFallback) {
        return Response.json(
          { error: "Could not extract readable text content from this webpage." },
          { status: 422 }
        );
      }

      return Response.json({
        title: "Extracted Webpage Content",
        text: cleanedFallback.slice(0, 10000), // Limit size
      });
    }

    // Clean up spaces in extracted text
    const cleanedText = article.textContent.replace(/\s+/g, " ").trim();

    return Response.json({
      title: article.title || "Extracted Webpage Content",
      text: cleanedText.slice(0, 10000), // Limit size to avoid overloading classifier
    });
  } catch (error: any) {
    console.error("Scraping error:", error);
    return Response.json(
      { error: error.message || "An error occurred while scraping the page." },
      { status: 500 }
    );
  }
}
