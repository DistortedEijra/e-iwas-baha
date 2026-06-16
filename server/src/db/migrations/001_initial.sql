-- Phase 1: initial schema
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS road_segments (
  id            SERIAL PRIMARY KEY,
  osm_id        BIGINT,
  name          TEXT,
  highway       TEXT,
  geom          GEOMETRY(LineString, 4326),
  length_m      REAL,
  base_weight   REAL,           -- distance cost; flood penalty applied at query time
  flood_depth_m REAL DEFAULT 0,
  passable      BOOLEAN DEFAULT TRUE,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS road_segments_geom_idx ON road_segments USING GIST (geom);

CREATE TABLE IF NOT EXISTS evac_centers (
  id        SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  address   TEXT,
  geom      GEOMETRY(Point, 4326),
  capacity  INT,
  active    BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS evac_centers_geom_idx ON evac_centers USING GIST (geom);

CREATE TABLE IF NOT EXISTS flood_zones (
  id           SERIAL PRIMARY KEY,
  geom         GEOMETRY(MultiPolygon, 4326),
  hazard_level TEXT CHECK (hazard_level IN ('low', 'medium', 'high')),
  source       TEXT DEFAULT 'HazardHunterPH'
);
CREATE INDEX IF NOT EXISTS flood_zones_geom_idx ON flood_zones USING GIST (geom);

-- Crowd-sourced / sensor road reports; triggers recalculation in the routing engine
CREATE TABLE IF NOT EXISTS road_reports (
  id            SERIAL PRIMARY KEY,
  segment_id    INT REFERENCES road_segments(id) ON DELETE CASCADE,
  flood_depth_m REAL NOT NULL,
  source        TEXT DEFAULT 'user',
  reported_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS road_reports_segment_idx ON road_reports (segment_id);
