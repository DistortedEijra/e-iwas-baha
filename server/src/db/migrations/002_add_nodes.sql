-- Phase 2: road graph topology (nodes + FK columns on road_segments)
CREATE TABLE IF NOT EXISTS nodes (
  id   BIGINT PRIMARY KEY,   -- OSM/osmnx node ID
  lat  REAL NOT NULL,
  lng  REAL NOT NULL,
  geom GEOMETRY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS nodes_geom_idx ON nodes USING GIST (geom);

ALTER TABLE road_segments
  ADD COLUMN IF NOT EXISTS from_node_id BIGINT REFERENCES nodes(id),
  ADD COLUMN IF NOT EXISTS to_node_id   BIGINT REFERENCES nodes(id);

CREATE INDEX IF NOT EXISTS road_segments_from_node_idx ON road_segments (from_node_id);
CREATE INDEX IF NOT EXISTS road_segments_to_node_idx   ON road_segments (to_node_id);
