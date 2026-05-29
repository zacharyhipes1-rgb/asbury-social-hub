import config


def fetch_flow(ticker):
    if not config.UNUSUAL_WHALES_ENABLED:
        return None, 0, 0
    # Stub: implement when API key is available
    return None, 0, 0


if __name__ == "__main__":
    if not config.UNUSUAL_WHALES_ENABLED:
        print("Unusual Whales integration disabled. Set UNUSUAL_WHALES_ENABLED=True in config.py to activate.")
