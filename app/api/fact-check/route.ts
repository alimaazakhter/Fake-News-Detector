export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    if (!query || typeof query !== "string") {
      return Response.json({ error: "Invalid search query." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_FACT_CHECK_API_KEY;

    if (!apiKey) {
      return Response.json({
        claims: [],
        error: "API_KEY_NOT_CONFIGURED",
        message: "Google Fact Check API Key is not set in environment variables.",
      });
    }

    // Clean up the query to focus on the key claim
    // (fact check API works best with shorter sentences/topics rather than full article texts)
    const processedQuery = query.length > 150 
      ? query.slice(0, 150).split(" ").slice(0, -1).join(" ") // cut to ~150 chars
      : query;

    const apiUrl = `https://factchecktools.googleapis.com/v1alpha1/claims:search?query=${encodeURIComponent(
      processedQuery
    )}&pageSize=5&key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google API responded with error:", errText);
      return Response.json(
        { error: "Failed to fetch from Fact Check API." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Map response to a simplified format for UI rendering
    const claims = (data.claims || []).map((claim: any) => {
      const review = claim.claimReview?.[0] || {};
      return {
        text: claim.text,
        claimant: claim.claimant || "Unknown",
        claimDate: claim.claimDate || "",
        publisherName: review.publisher?.name || "Unknown",
        publisherSite: review.publisher?.site || "",
        rating: review.textualRating || "No verdict",
        reviewUrl: review.url || "",
      };
    });

    return Response.json({ claims });
  } catch (error: any) {
    console.error("Fact-check error:", error);
    return Response.json(
      { error: error.message || "An error occurred during fact check validation." },
      { status: 500 }
    );
  }
}
