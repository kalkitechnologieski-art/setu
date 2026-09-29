import modal
app = modal.App("kalki-scheduler")

@app.function(schedule=modal.Cron("*/5 * * * *"), scaledown_window=60, max_containers=1)
def sync_ad_performance():
    print("[scheduler] ad performance sync")

@app.function(schedule=modal.Cron("0 */6 * * *"), scaledown_window=60, max_containers=1)
def refresh_platform_tokens():
    print("[scheduler] token refresh")

@app.function(schedule=modal.Cron("0 9 * * *"), scaledown_window=60, max_containers=1)
def daily_digest():
    print("[scheduler] daily digest")

@app.function(schedule=modal.Cron("0 2 * * *"), scaledown_window=60, max_containers=1)
def calibrate_confidence():
    print("[scheduler] confidence calibration")
