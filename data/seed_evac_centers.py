#!/usr/bin/env python3
"""
Phase 1 – Evacuation Center Seed Data
Inserts known evacuation centers in Marikina City into evac_centers.

Usage:
    python seed_evac_centers.py

Environment:
    DATABASE_URL  PostgreSQL DSN (default: local Docker instance)
"""

import os
import logging
import psycopg2
from psycopg2.extras import execute_values

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://eiwas:eiwas_pw@localhost:5432/eiwas_baha",
)

# (name, address, longitude, latitude, capacity)
# Coordinates verified against OSM; capacity figures are indicative estimates.
CENTERS: list[tuple] = [
    (
        "Marikina Sports Center",
        "JP Rizal Ave cor. Shoe Ave, Marikina City",
        121.10291, 14.65068, 5000,
    ),
    (
        "Marikina City Hall",
        "JP Rizal St, Marikina City",
        121.10231, 14.65040, 300,
    ),
    (
        "Nangka Elementary School",
        "Gen. Ordoñez St, Nangka, Marikina City",
        121.10540, 14.67890, 800,
    ),
    (
        "Sto. Niño Elementary School",
        "Sto. Niño, Marikina City",
        121.10380, 14.65240, 600,
    ),
    (
        "Parang National High School",
        "P. Tuazon Blvd, Parang, Marikina City",
        121.10450, 14.66180, 1200,
    ),
    (
        "Concepcion Elementary School",
        "Concepcion Uno, Marikina City",
        121.09420, 14.67010, 700,
    ),
    (
        "Tumana Elementary School",
        "Tumana, Marikina City",
        121.11400, 14.68320, 500,
    ),
    (
        "Jesus Is Lord Church Worldwide – Marikina",
        "Marikina City",
        121.10010, 14.65500, 2000,
    ),
    (
        "Sta. Elena Elementary School",
        "Sta. Elena, Marikina City",
        121.11200, 14.66400, 600,
    ),
    (
        "Marikina Science High School",
        "Sumulong Highway, Marikina City",
        121.09800, 14.64900, 900,
    ),
]


def seed(db_url: str) -> None:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    sql = """
        INSERT INTO evac_centers (name, address, geom, capacity, active)
        VALUES %s
        ON CONFLICT DO NOTHING
    """
    values = [
        (name, address, f"SRID=4326;POINT({lon} {lat})", capacity, True)
        for name, address, lon, lat, capacity in CENTERS
    ]
    execute_values(cur, sql, values)
    conn.commit()

    cur.execute("SELECT count(*) FROM evac_centers")
    count = cur.fetchone()[0]
    log.info("Seeded %d centers. Total rows in evac_centers: %d.", len(CENTERS), count)

    cur.close()
    conn.close()


if __name__ == "__main__":
    seed(DATABASE_URL)
