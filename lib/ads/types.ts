// lib/ads/types.ts

export interface AdPlatformRow {
  platform: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  share: number;
}

export interface AdCampaignRow {
  platform: string;
  campaign_name: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  status: "healthy" | "warning" | "paused";
}

export interface BudgetRecommendation {
  id: string;
  from_platform: string;
  to_platform: string;
  amount: number;
  reason: string;
  confidence: number;
  expected_impact: string;
}
