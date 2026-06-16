#!/usr/bin/env python3
"""
Phase 1/2 – OSM Road Network Import
Downloads the drive network for Marikina City via osmnx and bulk-inserts
nodes + directed edges into the nodes / road_segments PostGIS tables.

Usage:
    python import_osm.py

Environment:
    DATABASE_URL  PostgreSQL DSN (default: local Docker instance)
"""

import os
import logging
from typing import Iterator

import osmnx as ox
import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import LineString

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://eiwas:eiwas_pw@localhost:5432/eiwas_baha",
)

PLACE = "Marikina City, Metro Manila, Philippines"
NETWORK_TYPE = "drive"
BATCH_SIZE = 500


def _scalar(value) -> int:
    if isinstance(value, (list, tuple)):
        return int(value[0])
    return int(value)


def _str_or_none(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (list, tuple)):
        return str(value[0])
    return str(value)


def download_graph():
    log.info("Downloading road graph for: %s", PLACE)
    G = ox.graph_from_place(PLACE, network_type=NETWORK_TYPE, simplify=True)
    # osmnx ≥ 2.0 adds edge lengths automatically during graph_from_place
    if not any("length" in d for _, _, d in G.edges(data=True)):
        G = ox.distance.add_edge_lengths(G)
    log.info("Graph: %d nodes, %d directed edges", G.number_of_nodes(), G.number_of_edges())
    return G


def iter_node_rows(G) -> Iterator[tuple]:
    for node_id, data in G.nodes(data=True):
        lat = float(data["y"])
        lng = float(data["x"])
        yield (int(node_id), lat, lng, f"SRID=4326;POINT({lng} {lat})")


def iter_edge_rows(G) -> Iterator[tuple]:
    for u, v, data in G.edges(data=True):
        geom = data.get("geometry")
        if geom is None:
            u_d = G.nodes[u]
            v_d = G.nodes[v]
            geom = LineString([(u_d["x"], u_d["y"]), (v_d["x"], v_d["y"])])

        length_m = float(data.get("length", geom.length * 111_139))
        yield (
            _scalar(data.get("osmid", 0)),
            _str_or_none(data.get("name")),
            _str_or_none(data.get("highway")),
            f"SRID=4326;{geom.wkt}",
            length_m,
            length_m,   # base_weight == distance; flood penalty applied at query time
            int(u),
            int(v),
        )


def load(G, db_url: str) -> dict:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    # --- nodes ---
    log.info("Inserting nodes …")
    node_sql = """
        INSERT INTO nodes (id, lat, lng, geom)
        VALUES %s
        ON CONFLICT (id) DO NOTHING
    """
    node_batch: list[tuple] = []
    node_count = 0
    for row in iter_node_rows(G):
        node_batch.append(row)
        if len(node_batch) >= BATCH_SIZE:
            execute_values(cur, node_sql, node_batch)
            node_count += len(node_batch)
            node_batch = []
    if node_batch:
        execute_values(cur, node_sql, node_batch)
        node_count += len(node_batch)
    log.info("  %d nodes inserted.", node_count)

    # --- edges ---
    log.info("Inserting road segments …")
    edge_sql = """
        INSERT INTO road_segments
            (osm_id, name, highway, geom, length_m, base_weight, from_node_id, to_node_id)
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    edge_batch: list[tuple] = []
    edge_count = 0
    for row in iter_edge_rows(G):
        edge_batch.append(row)
        if len(edge_batch) >= BATCH_SIZE:
            execute_values(cur, edge_sql, edge_batch)
            edge_count += len(edge_batch)
            edge_batch = []
            log.info("  %d edges so far …", edge_count)
    if edge_batch:
        execute_values(cur, edge_sql, edge_batch)
        edge_count += len(edge_batch)

    conn.commit()
    cur.close()
    conn.close()
    return {"nodes": node_count, "edges": edge_count}


def main() -> None:
    G = download_graph()
    stats = load(G, DATABASE_URL)
    log.info(
        "Done — %d nodes, %d road segments loaded.",
        stats["nodes"],
        stats["edges"],
    )


if __name__ == "__main__":
    main()
