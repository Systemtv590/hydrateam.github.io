import fs from "node:fs/promises";

const STATS_PATH = new URL("../data/stats.json", import.meta.url);
const CURSEFORGE = "https://www.curseforge.com/members/hydrateam/projects";
const MCMODELS = "https://mcmodels.net/vendors/232/hydra-team";

const parseHumanNumber = (value, suffix = "") => {
  const n = Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  const mult = ({ K: 1e3, M: 1e6, B: 1e9 })[suffix.toUpperCase()] || 1;
  return Math.round(n * mult);
};

const fetchHtml = async url => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 HydraTeamStats/2.0",
      "accept-language": "en-US,en;q=0.9"
    }
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
};

const firstNumberMatch = (html, patterns) => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const value = parseHumanNumber(match[1], match[2] || "");
      if (value !== null) return value;
    }
  }
  return null;
};

const current = JSON.parse(await fs.readFile(STATS_PATH, "utf8"));
const next = { ...current };

try {
  const html = await fetchHtml(CURSEFORGE);
  const downloads = firstNumberMatch(html, [
    /([\d,.]+)\s*([KMB]?)\s*Downloads/i,
    /Downloads<\/[^>]+>\s*<[^>]+>([\d,.]+)\s*([KMB]?)/i,
    /"label"\s*:\s*"Downloads"[^\d]*([\d,.]+)\s*([KMB]?)/i
  ]);
  const projects = firstNumberMatch(html, [
    /([\d,]+)\s*Projects/i,
    /Projects<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /"label"\s*:\s*"Projects"[^\d]*([\d,]+)/i
  ]);
  if (downloads !== null) next.curseforgeDownloads = downloads;
  if (projects !== null) next.curseforgeProjects = projects;
} catch (error) {
  console.warn("CurseForge refresh skipped:", error.message);
}

try {
  const html = await fetchHtml(MCMODELS);
  const sales = firstNumberMatch(html, [
    /([\d,]+)\s*Sales/i,
    /Sales<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /"sales"[^\d]*([\d,]+)/i
  ]);
  const products = firstNumberMatch(html, [
    /Browse all\s+([\d,]+)\s+available products/i,
    /([\d,]+)\s*Products/i,
    /"products"[^\d]*([\d,]+)/i
  ]);
  if (sales !== null) next.mcmodelsSales = sales;
  if (products !== null) next.mcmodelsProducts = products;
} catch (error) {
  console.warn("MCModels refresh skipped:", error.message);
}

next.lastUpdated = new Date().toISOString();
await fs.writeFile(STATS_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
console.log("Updated stats:", next);
