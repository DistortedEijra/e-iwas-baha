#!/usr/bin/env python3
"""
Phase 1 stub – HazardHunterPH Flood Zone Import
Full implementation: Phase 2+.

To use:
1. Download flood-susceptibility shapefiles from HazardHunterPH
   (https://www.hazardhunter.georisk.gov.ph) for the target LGU.
2. Place the .shp/.dbf/.prj/.shx set in data/hazard_shapefiles/.
3. Run this script.

It reads each polygon, maps the hazard class to 'low'/'medium'/'high',
and loads it into flood_zones via GeoPandas + psycopg2.
"""

import os
import logging
import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_values
from shapely.geometry import mapping
import json

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://eiwas:eiwas_pw@localhost:5432/eiwas_baha",
)

SHAPEFILE_DIR = os.path.join(os.path.dirname(__file__), "hazard_shapefiles")

# HazardHunterPH attribute name for hazard class (verify against your shapefile)
HAZARD_FIELD = "Var"

HAZARD_MAP: dict[str, str] = {
    "Low": "low",
    "Medium": "medium",
    "High": "high",
    "L": "low",
    "M": "medium",
    "H": "high",
}


def load(shapefile_path: str, db_url: str) -> int:
    log.info("Reading %s …", shapefile_path)
    gdf = gpd.read_file(shapefile_path).to_crs(epsg=4326)

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    sql = """
        INSERT INTO flood_zones (geom, hazard_level, source)
        VALUES %s
    """
    rows = []
    for _, row in gdf.iterrows():
        raw_level = str(row.get(HAZARD_FIELD, "")).strip()
        level = HAZARD_MAP.get(raw_level)
        if level is None:
            log.warning("Unknown hazard class %r – skipping row.", raw_level)
            continue
        geom_wkt = row.geometry.wkt
        rows.append((f"SRID=4326;{geom_wkt}", level, "HazardHunterPH"))

    execute_values(cur, sql, rows)
    conn.commit()
    cur.close()
    conn.close()
    return len(rows)


def main() -> None:
    import glob
    shapefiles = glob.glob(os.path.join(SHAPEFILE_DIR, "*.shp"))
    if not shapefiles:
        log.error(
            "No shapefiles found in %s. "
            "Download flood susceptibility layers from HazardHunterPH first.",
            SHAPEFILE_DIR,
        )
        return
    for shp in shapefiles:
        total = load(shp, DATABASE_URL)
        log.info("Loaded %d flood zones from %s.", total, shp)


if __name__ == "__main__":
    main()
