-- Phase 7: user acceptability evaluation responses
CREATE TABLE IF NOT EXISTS uat_responses (
  id                SERIAL PRIMARY KEY,
  usability         SMALLINT NOT NULL CHECK (usability BETWEEN 1 AND 5),
  route_clarity     SMALLINT NOT NULL CHECK (route_clarity BETWEEN 1 AND 5),
  alert_usefulness  SMALLINT NOT NULL CHECK (alert_usefulness BETWEEN 1 AND 5),
  would_use         BOOLEAN,
  comments          TEXT,
  submitted_at      TIMESTAMPTZ DEFAULT now()
);
