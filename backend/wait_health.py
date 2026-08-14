import time, urllib.request

ok = False
for _ in range(20):
    time.sleep(0.5)
    try:
        urllib.request.urlopen("http://127.0.0.1:8321/api/health", timeout=1)
        ok = True
        break
    except Exception:
        pass

print("SERVER_OK" if ok else "SERVER_FAIL")
