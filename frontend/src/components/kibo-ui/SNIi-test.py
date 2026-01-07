#!/usr/bin/env python3
"""
TLS SNI Reachability Lab Tool (Complete Package)
- Hardened TLS handshake tests with retries & classification
- CSV logging for audit
- Optional Matplotlib graph of allowed vs blocked SNIs
- Guidance for Wireshark capture & firewall log correlation
"""

import socket
import ssl
import time
import csv
import random
import argparse
import sys
import matplotlib.pyplot as plt

# -----------------------------
# Defaults (safe & academic)
# -----------------------------
DEFAULT_TARGET_IP = "1.1.1.1"
DEFAULT_PORT = 443
DEFAULT_TIMEOUT = 4
DEFAULT_RETRIES = 3
DEFAULT_DELAY_MIN = 2.0
DEFAULT_DELAY_MAX = 4.0
DEFAULT_RESULTS = "results.csv"

DEFAULT_SNI_LIST = [
    "ekb.eg",
    "google.com",
    "cloudflare.com",
    "example.com",
    "wikipedia.org"
]

# -----------------------------
# Utilities
# -----------------------------
def jitter_sleep(a, b):
    """Sleep for a random duration between a and b"""
    time.sleep(random.uniform(a, b))

def die(msg):
    """Exit program with fatal error"""
    print(f"[FATAL] {msg}")
    sys.exit(1)

def preflight_route_check(target_ip):
    """
    Basic sanity check: can we open a TCP socket at all?
    This does NOT test TLS, only routing.
    """
    try:
        s = socket.create_connection((target_ip, DEFAULT_PORT), timeout=2)
        s.close()
        return True
    except Exception:
        return False

# -----------------------------
# TLS Test
# -----------------------------
def tls_handshake_once(target_ip, port, timeout, sni):
    """
    One TLS handshake attempt.
    Returns a classified result string.
    """
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE

    sock = None
    tls = None

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        sock.connect((target_ip, port))

        tls = context.wrap_socket(sock, server_hostname=sni)
        # Handshake succeeded
        return "SUCCESS"

    except socket.timeout:
        return "TIMEOUT"

    except ConnectionResetError:
        return "RESET"

    except ssl.SSLError:
        return "TLS_ERROR"

    except Exception:
        return "OTHER_ERROR"

    finally:
        try:
            if tls:
                tls.close()
        except Exception:
            pass
        try:
            if sock:
                sock.close()
        except Exception:
            pass

def tls_handshake_quorum(target_ip, port, timeout, sni, retries):
    """
    Run multiple handshake attempts and decide by majority vote
    """
    outcomes = []
    for _ in range(retries):
        outcomes.append(tls_handshake_once(target_ip, port, timeout, sni))
        jitter_sleep(0.5, 1.2)

    # Majority decision
    counts = {}
    for o in outcomes:
        counts[o] = counts.get(o, 0) + 1

    final = max(counts, key=counts.get)
    return final, outcomes

# -----------------------------
# Graph Generation
# -----------------------------
def plot_results(results):
    snis = [r['sni'] for r in results]
    values = [1 if r['final_result'] == 'SUCCESS' else 0 for r in results]
    colors = ['green' if v==1 else 'red' for v in values]

    plt.figure(figsize=(8,5))
    plt.bar(snis, values, color=colors)
    plt.xlabel('SNI')
    plt.ylabel('Handshake Success (1=SUCCESS, 0=FAIL)')
    plt.title('TLS SNI Reachability')
    plt.ylim(0,1.2)
    plt.grid(axis='y', linestyle='--', alpha=0.5)
    plt.show()

# -----------------------------
# Main
# -----------------------------
def main():
    parser = argparse.ArgumentParser(description="TLS SNI Reachability Lab Tool (Complete Package)")
    parser.add_argument("--ip", default=DEFAULT_TARGET_IP)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--out", default=DEFAULT_RESULTS)
    parser.
    add_argument("--graph", action="store_true", help="Show bar graph of results")
    args = parser.parse_args()

    target_ip = args.ip
    port = args.port
    timeout = args.timeout
    retries = args.retries
    results_file = args.out

    print("\n=== TLS SNI Reachability Experiment (Hardened + Complete) ===\n")

    # Preflight routing check
    if not preflight_route_check(target_ip):
        die("Routing preflight failed. Check gateway/firewall placement.")
    print("[OK] Routing preflight passed\n")

    results = []

    for sni in DEFAULT_SNI_LIST:
        print(f"Testing SNI: {sni}")

        final, raw = tls_handshake_quorum(
            target_ip=target_ip,
            port=port,
            timeout=timeout,
            sni=sni,
            retries=retries
        )

        print(f"  Attempts: {raw}")
        print(f"  Final:    {final}\n")

        results.append({
            "sni": sni,
            "final_result": final,
            "attempts": ";".join(raw)
        })

        jitter_sleep(DEFAULT_DELAY_MIN, DEFAULT_DELAY_MAX)

    # Write CSV with raw attempts for audit
    with open(results_file, "w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["sni", "final_result", "attempts"]
        )
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    print("Experiment completed successfully.")
    print(f"Results saved to {results_file}\n")

    print("Summary:")
    for r in results:
        print(f"  {r['sni']} -> {r['final_result']}")

    # Optional: Graph visualization
    if args.graph:
        plot_results(results)

    # -----------------------------
    # Wireshark & Firewall Instructions
    # -----------------------------
    print("\n=== Guidance for Further Verification ===")
    print("1. Wireshark Capture:")
    print("   - Capture on the firewall interface facing the client.")
    print("   - Filter: tls.handshake.type == 1")
    print("   - Expand ClientHello to check 'Server Name' field for SNI")
    print("   - Confirm SUCCESS SNIs receive ServerHello; blocked SNIs do not.\n")
    print("2. Firewall Logs Correlation:")
    print("   - Add iptables logging rule: sudo iptables -I FORWARD 3 -p tcp --dport 443 -j LOG --log-prefix 'SNI-DROP: '")
    print("   - Check logs: sudo dmesg | tail -n 50")
    print("   - Cross-check timestamps with CSV results\n")
    print("3. Graph:")
    print("   - Use --graph flag to visualize allowed (green) vs blocked (red) SNIs.\n")
    print("4. Report Template:")
    print("   - Include CSV results, Wireshark screenshots, bar chart, firewall logs, and explanation of methodology.")

if name == "__main__":
    main()