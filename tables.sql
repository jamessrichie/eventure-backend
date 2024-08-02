CREATE TABLE Users (
    user_id       TEXT PRIMARY KEY,
    username      TEXT        NOT NULL,
    picture       BLOB        NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password      TEXT        NOT NULL,
    session_token TEXT
);

CREATE TABLE Events (
    event_id     TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL REFERENCES Users(user_id),
    name         TEXT NOT NULL,
    location     TEXT NOT NULL,
    host         TEXT NOT NULL,
    start_time   TEXT NOT NULL,
    end_time     TEXT NOT NULL,
    description  TEXT NOT NULL,
    timestamp    TEXT NOT NULL
);

CREATE TABLE Reservations (
    reservation_id TEXT    PRIMARY KEY,
    user_id        TEXT    NOT NULL REFERENCES Users(user_id),
    arrival_id     TEXT    NOT NULL REFERENCES Arrivals(arrival_id),
    is_canceled    INTEGER NOT NULL,
    timestamp      TEXT    NOT NULL
);

CREATE TABLE Arrivals (
    arrival_id   TEXT    PRIMARY KEY,
    event_id     TEXT    NOT NULL REFERENCES Events(event_id),
    arrival_time TEXT    NOT NULL,
    capacity     INTEGER NOT NULL,
    UNIQUE(event_id, arrival_time)
);