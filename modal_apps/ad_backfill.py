import modal

app = modal.App("kalki-backfill")
image = modal.Image.debian_slim().pip_install(
    "supabase==2.5.0", "httpx==0.27.0"
)

@app.function(
    image=image,
    timeout=3600,
    scaledown_window=120,
    min_containers=0,
    max_containers=1,
    secrets=[modal.Secret.from_name("kalki-secrets")],
)
def backfill_ad_account(user_id: str, ad_account_id: str, platform: str = "meta_ads"):
    """Fetch 12 months of campaigns + daily insights from Meta."""
    import os, httpx
    from supabase import create_client

    supabase = create_client(
        os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"]
    )
    meta_token = os.environ.get("META_ACCESS_TOKEN", "")

    campaigns_resp = httpx.get(
        f"https://graph.facebook.com/v22.0/{ad_account_id}/campaigns",
        params={
            "access_token": meta_token,
            "fields": "id,name,status,objective,daily_budget",
            "effective_status": '["ACTIVE","PAUSED","COMPLETED","ARCHIVED"]',
            "limit": 500,
        }, timeout=60,
    )
    campaigns = campaigns_resp.json().get("data", [])

    rows = []
    for campaign in campaigns:
        insights_resp = httpx.get(
            f"https://graph.facebook.com/v22.0/{campaign['id']}/insights",
            params={
                "access_token": meta_token,
                "fields": "spend,impressions,clicks,actions,date_start",
                "time_increment": 1,
                "date_preset": "last_year",
                "limit": 500,
            }, timeout=60,
        )
        for i in insights_resp.json().get("data", []):
            actions = i.get("actions", [])
            conversions = sum(
                int(a.get("value", 0))
                for a in actions
                if a.get("action_type") in ("purchase", "lead", "complete_registration")
            )
            spend = float(i.get("spend", 0))
            rows.append({
                "user_id": user_id, "platform": platform,
                "campaign_name": campaign["name"],
                "spend": spend,
                "impressions": int(i.get("impressions", 0)),
                "clicks": int(i.get("clicks", 0)),
                "conversions": conversions,
                "roas": conversions * 100 / spend if spend > 0 else 0,
                "synced_at": i.get("date_start", ""),
            })

    if rows:
        supabase.table("ad_performance").upsert(rows).execute()

    supabase.table("notifications").insert({
        "user_id": user_id,
        "title": f"Synced {len(campaigns)} campaigns from Meta",
        "body": "Historical data from the last 12 months is now available.",
        "kind": "success", "link": "/ads",
    }).execute()

    return {"campaigns": len(campaigns), "rows": len(rows)}
