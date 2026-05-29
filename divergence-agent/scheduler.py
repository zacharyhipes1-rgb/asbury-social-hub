import time
import schedule

import config
from main import run_full_cycle
from emailer import send_daily_digest


def start():
    print(f"Divergence Agent starting. Refresh interval: {config.REFRESH_INTERVAL_MINUTES} minutes.")

    print("Running initial cycle...")
    run_full_cycle()

    schedule.every(config.REFRESH_INTERVAL_MINUTES).minutes.do(run_full_cycle)
    schedule.every().day.at("08:00").do(send_daily_digest)

    print(f"Scheduler active. Hourly refresh + daily 8AM email digest.")
    print("Press Ctrl+C to stop.")
    while True:
        schedule.run_pending()
        time.sleep(30)


if __name__ == "__main__":
    start()
