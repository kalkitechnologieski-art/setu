import modal, re
app = modal.App("kalki-lead-scraper")
image = (
    modal.Image.debian_slim()
    .pip_install("httpx==0.27.0", "beautifulsoup4==4.12.3", "lxml==5.2.1")
)
EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

@app.function(
    image=image, timeout=1800, memory=2048,
    scaledown_window=120, min_containers=0, max_containers=1,
)
def scrape_google_maps(query: str, location: str, grid_size: int = 5):
    """Scrape Google Maps using geo-grid slicing to bypass 120-result cap."""
    import httpx, os
    api_key = os.environ["GOOGLE_PLACES_API_KEY"]
    cells = _generate_grid(location, grid_size)
    seen = set()
    results = []
    with httpx.Client(timeout=30) as client:
        for cell in cells:
            resp = client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={"query": f"{query} in {cell}", "key": api_key},
            )
            for place in resp.json().get("results", []):
                pid = place.get("place_id")
                if pid and pid not in seen:
                    seen.add(pid)
                    results.append({
                        "place_id": pid, "name": place.get("name"),
                        "address": place.get("formatted_address"),
                        "rating": place.get("rating"),
                        "user_ratings_total": place.get("user_ratings_total"),
                        "lat": place.get("geometry", {}).get("location", {}).get("lat"),
                        "lng": place.get("geometry", {}).get("location", {}).get("lng"),
                    })
    return results[:500]

@app.function(image=image, timeout=900, scaledown_window=60, max_containers=1)
def extract_emails(places: list[dict]):
    import httpx
    from bs4 import BeautifulSoup
    results = []
    with httpx.Client(timeout=15, follow_redirects=True) as client:
        for place in places:
            website = place.get("website")
            if not website:
                results.append({**place, "emails": []}); continue
            try:
                resp = client.get(website, headers={"User-Agent": "Mozilla/5.0"})
                soup = BeautifulSoup(resp.text, "lxml")
                text = soup.get_text(" ", strip=True)
                emails = list(set(EMAIL_RE.findall(text)))[:5]
                results.append({**place, "emails": emails, "website": website})
            except Exception:
                results.append({**place, "emails": []})
    return results

def _generate_grid(location: str, size: int) -> list[str]:
    return [f"{location} zone {i+1}" for i in range(size * size)]
