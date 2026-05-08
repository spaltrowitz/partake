import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GitHub token not configured" }, { status: 503 });
  }

  try {
    const { category, summary, details } = await req.json();
    if (!category || !summary) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const emoji = category === "bug" ? "🐛" : category === "idea" ? "💡" : "💜";
    const label = category === "bug" ? "bug" : category === "idea" ? "enhancement" : "feedback";

    const title = `${emoji} ${summary}`;
    const body = [
      `**Category:** ${category}`,
      `**Summary:** ${summary}`,
      details ? `**Details:** ${details}` : "",
      "",
      "---",
      "*Submitted via Partake feedback widget*",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.github.com/repos/spaltrowitz/partake/issues", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({
        title,
        body,
        labels: [label, "squad"],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("GitHub API error:", err);
      throw new Error(err.message || "GitHub API error");
    }

    const issue = await res.json();
    return NextResponse.json({ url: issue.html_url });
  } catch (error) {
    console.error("Feedback error:", error);
    const msg = error instanceof Error ? error.message : "Failed to submit feedback";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
