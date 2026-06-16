#!/usr/bin/env python3
"""
E-Iwas Baha — Flood Demo Script
================================
Floods a section of the direct route from a demo position, forcing
the router to find a detour.  The web app picks up the change via
socket.io and re-routes automatically.

Usage:
    python demo_flood.py           # Run demo (flood + show route change)
    python demo_flood.py --clear   # Remove all flood data and reset
"""
import sys
import time
import json
import urllib.request
import urllib.error

BASE = "http://localhost:3001"

# A point in lower Marikina near the Marikina River — an area that
# historically floods and has multiple possible routes to evac centers.
DEMO_LAT = 14.6250
DEMO_LNG = 121.0940


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def get(path):
    try:
        with urllib.request.urlopen(f"{BASE}{path}") as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        print(f"  GET {path} → HTTP {e.code}")
        return None


def post(path, body=None):
    data = json.dumps(body or {}).encode()
    req = urllib.request.Request(
        f"{BASE}{path}", data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        return None, e.code


# ── Route helpers ─────────────────────────────────────────────────────────────

def get_route(lat=DEMO_LAT, lng=DEMO_LNG):
    return get(f"/api/route?lat={lat}&lng={lng}")


def flood_segment(seg_id, depth=0.7):
    _, status = post(f"/api/admin/segments/{seg_id}/flood", {"flood_depth_m": depth})
    return status


def clear_segment(seg_id):
    _, status = post(f"/api/admin/segments/{seg_id}/clear")
    return status


def seg_label(f):
    p = f["properties"]
    return p.get("name") or p.get("highway") or f"#{p['segmentId']}"


# ── Main flows ────────────────────────────────────────────────────────────────

def run_demo():
    print("=" * 56)
    print("  E-Iwas Baha — Flood Demo")
    print("=" * 56)
    print(f"\n  Demo start : ({DEMO_LAT}, {DEMO_LNG})")
    print("  (Click this spot on the map after running the script)\n")

    # ── Step 1: original route ────────────────────────────────────────────────
    print(">>> Step 1  Original route")
    route = get_route()
    if not route or not route.get("reachable"):
        print("  ERROR: no route from demo position. Is the server running?")
        return

    feats   = route["route"]["features"]
    seg_ids = [f["properties"]["segmentId"] for f in feats]
    labels  = [seg_label(f) for f in feats]

    print(f"  Destination : {route['evacuationCenter']}")
    print(f"  Distance    : {route['totalLengthM']:,.0f} m")
    print(f"  Segments    : {len(seg_ids)}")
    print(f"  Roads       : {' → '.join(labels[:6])}{'…' if len(labels) > 6 else ''}")

    # ── Step 2: flood the middle quarter of the route ─────────────────────────
    n           = len(seg_ids)
    start_i     = max(2, n // 5)          # skip the first couple (near the user)
    end_i       = min(n - 2, start_i + 5) # flood up to 5 segments
    to_flood    = seg_ids[start_i:end_i]
    flood_depth = 0.7                      # 70 cm — above the 50 cm threshold → impassable

    print(f"\n>>> Step 2  Flooding {len(to_flood)} segments along the direct path")
    print(f"  Segment IDs : {to_flood}")
    print(f"  Depth       : {flood_depth} m  (impassable — above 0.50 m threshold)")
    print(f"  Roads       : {' → '.join(labels[start_i:end_i])}")
    print()

    for sid in to_flood:
        status = flood_segment(sid, flood_depth)
        road   = labels[seg_ids.index(sid)]
        ok     = "✓" if status == 200 else f"HTTP {status}"
        print(f"    {ok}  segment {sid}  ({road})")

    print("\n  Waiting 2 s for socket.io broadcast + auto-reroute on the web app…")
    time.sleep(2)

    # ── Step 3: new route ─────────────────────────────────────────────────────
    print("\n>>> Step 3  New route after flooding")
    new_route = get_route()

    if not new_route or not new_route.get("reachable"):
        print("  All routes blocked! Clearing one segment to ensure reachability…")
        clear_segment(to_flood[-1])
        time.sleep(1)
        new_route = get_route()

    if new_route and new_route.get("reachable"):
        new_feats   = new_route["route"]["features"]
        new_ids     = [f["properties"]["segmentId"] for f in new_feats]
        new_labels  = [seg_label(f) for f in new_feats]

        flooded_in_new = set(to_flood) & set(new_ids)
        detoured       = len(flooded_in_new) == 0

        print(f"  Destination : {new_route['evacuationCenter']}")
        print(f"  Distance    : {new_route['totalLengthM']:,.0f} m  "
              f"(+{new_route['totalLengthM'] - route['totalLengthM']:+.0f} m detour)")
        print(f"  Segments    : {len(new_ids)}")
        print(f"  Roads       : {' → '.join(new_labels[:6])}{'…' if len(new_labels) > 6 else ''}")
        print()

        if detoured:
            print("  ✓ ROUTE CHANGED — the app successfully avoided all flooded segments")
        else:
            still = flooded_in_new
            print(f"  ~ PARTIAL detour — {len(still)} flooded segment(s) still on route")
            print(f"    (they may be the only link; router keeps passable=true segments)")
    else:
        print("  All evacuation routes are blocked — no safe path found.")

    # ── Summary ───────────────────────────────────────────────────────────────
    print("\n" + "=" * 56)
    print("  What to do in the browser")
    print("=" * 56)
    print(f"  1. Open http://localhost:5173")
    print(f"  2. Click the map at  Lat {DEMO_LAT}  Lng {DEMO_LNG}")
    print(f"     (lower Marikina, near the river)")
    print(f"  3. Watch the '📍 Simulated position' chip appear")
    print(f"  4. The route will draw from that point to the nearest")
    print(f"     open evacuation center")
    print(f"  5. Flooded segments show in AMBER/RED on the map")
    print(f"  6. The HUD (top-left) shows the detour instructions")
    print()
    print(f"  To reset:  python demo_flood.py --clear")
    print("=" * 56)


def run_clear():
    print("Clearing all flood data…")
    active = get("/api/admin/segments/active")
    if not active:
        print("  No flooded segments found (or server not reachable).")
        return
    print(f"  Found {len(active)} flooded segment(s)")
    for seg in active:
        status = clear_segment(seg["id"])
        ok     = "✓" if status == 200 else f"HTTP {status}"
        print(f"    {ok}  segment {seg['id']}  ({seg.get('name') or seg.get('highway') or '?'})")
    print("Done — all segments reset to passable, flood_depth_m = 0.")


if __name__ == "__main__":
    if "--clear" in sys.argv:
        run_clear()
    else:
        run_demo()
