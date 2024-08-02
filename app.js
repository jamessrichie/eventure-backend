/**
 * Name: James Richie Sulaeman
 * Date: 12/12/2023
 * Section: AB, Donovan and Kathryn
 *
 * This is the app.js code of event reservations app.
 * It defines the Eventure API, enabling users to create
 * and log into accounts, as well as create, view, delete,
 * sign up for, and withdraw from events.
 */
"use strict";
const express = require("express");
const app = express();
const multer = require("multer");
const sqlite3 = require('sqlite3');
const sqlite = require('sqlite');

// For application/x-www-form-urlencoded
app.use(express.urlencoded({extended: true})); // built-in middleware
// For application/json
app.use(express.json()); // built-in middleware
// For multipart/form-data (required with FormData)
app.use(multer().none()); // requires the "multer" module

const DAY_MILLISECONDS = 86400000;
const MYRIAD_YEARS = 10000;
const BASE_10 = 10;
const ID_LENGTH = 16;
const PORT_DEFAULT = 8000;
const BAD_REQUEST = 400;
const INTERNAL_SERVER_ERROR = 500;

/**
 * Retrieves details of upcoming events.
 *
 * Selects: event ID, name, location, host, number of spots filled, total capacity,
 *          start time, end time, description, and user registration status.
 *
 * Conditions:
 *  - Includes only events that have not ended, based on
 *    the event end time and the current local time.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if the user is registered for each event and has not canceled.
 *
 * Ordering: Events are ordered by their start time.
 */
const RETRIEVE_ALL_UPCOMING_EVENTS =
  `SELECT E.event_id AS eventId, E.name, E.location, E.host, IFNULL(SQ1.filled, 0) AS filled,
          SQ2.capacity, E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN SQ3.event_id IS NOT NULL
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A.event_id, COUNT(*) AS filled
     FROM Reservations as R, Arrivals as A
     WHERE R.arrival_id = A.arrival_id AND R.is_canceled = 0
     GROUP BY A.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
            CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
              THEN -1
              ELSE SUM(capacity)
            END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN
    (SELECT A.event_id
     FROM Reservations AS R,
          Arrivals AS A
     WHERE R.arrival_id = A.arrival_id AND R.user_id = ? AND R.is_canceled = 0) AS SQ3
  ON E.event_id = SQ3.event_id
  WHERE DATETIME(E.end_time) > datetime('now', 'localtime')
  ORDER BY DATETIME(E.start_time)`;

/**
 * Retrieves details of upcoming events that have not reached capacity.
 *
 * Selects: event ID, name, location, host, number of filled spots, total capacity,
 *          start time, end time, description, and user registration status.
 *
 * Conditions:
 *  - Includes only events that are not full.
 *  - Includes only events that have not ended, based on
 *    the event end time and the current local time.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if the user is registered for each event and has not canceled.
 *
 * Ordering: Events are ordered by their start time.
 */
const RETRIEVE_OPEN_UPCOMING_EVENTS =
  `SELECT E.event_id AS eventId, E.name, E.location, E.host, IFNULL(SQ1.filled, 0) AS filled,
          SQ2.capacity, E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN SQ3.event_id IS NOT NULL
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A.event_id, COUNT(*) AS filled
     FROM Reservations as R, Arrivals as A
     WHERE R.arrival_id = A.arrival_id AND R.is_canceled = 0
     GROUP BY A.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
            CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
              THEN -1
              ELSE SUM(capacity)
            END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN
    (SELECT A.event_id
     FROM Reservations AS R, Arrivals AS A
     WHERE R.arrival_id = A.arrival_id AND R.user_id = ? AND R.is_canceled = 0) AS SQ3
  ON E.event_id = SQ3.event_id
  WHERE IFNULL(SQ1.filled, 0) != SQ2.capacity AND
        DATETIME(E.end_time) > datetime('now', 'localtime')
  ORDER BY DATETIME(E.start_time)`;

/**
 * Retrieves details of upcoming events not yet registered by the user.
 *
 * Selects: event ID, name, location, host, number of filled spots, total capacity,
 *          start time, end time, description, and user registration status.
 *
 * Conditions:
 *  - Includes only events that the user has not registered for.
 *  - Includes only events that have not ended, based on
 *    the event end time and the current local time.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if the user is registered for each event and has not canceled.
 *
 * Ordering: Events are ordered by their start time.
 */
const RETRIEVE_UNREGISTERED_UPCOMING_EVENTS =
  `SELECT E.event_id AS eventId, E.name, E.location, E.host, IFNULL(SQ1.filled, 0) AS filled,
          SQ2.capacity, E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN SQ3.event_id IS NOT NULL
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A.event_id, COUNT(*) AS filled
     FROM Reservations as R, Arrivals as A
     WHERE R.arrival_id = A.arrival_id AND R.is_canceled = 0
     GROUP BY A.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
            CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
              THEN -1
              ELSE SUM(capacity)
            END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN
    (SELECT A.event_id
     FROM Reservations AS R, Arrivals AS A
     WHERE R.arrival_id = A.arrival_id AND R.user_id = ? AND R.is_canceled = 0) AS SQ3
  ON E.event_id = SQ3.event_id
  WHERE SQ3.event_id IS NULL AND
        DATETIME(E.end_time) > datetime('now', 'localtime')
  ORDER BY DATETIME(E.start_time)`;

/**
 * Retrieves details of a specific event.
 *
 * Selects: event ID, name, location, host, number of filled spots, total capacity,
 *          start time, end time, description, and user registration status.
 *
 * Conditions:
 *  - Includes only the event that matches the given id.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if the user is registered for each event and has not canceled.
 */
const RETRIEVE_SPECIFIC_EVENT =
  `SELECT E.event_id AS eventId, E.name, E.location, E.host, IFNULL(SQ1.filled, 0) AS filled,
          SQ2.capacity, E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN SQ3.event_id IS NOT NULL
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A.event_id, COUNT(*) AS filled
     FROM Reservations as R, Arrivals as A
     WHERE R.arrival_id = A.arrival_id AND R.is_canceled = 0
     GROUP BY A.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
            CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
              THEN -1
              ELSE SUM(capacity)
            END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN
    (SELECT A.event_id
     FROM Reservations AS R, Arrivals AS A
     WHERE R.arrival_id = A.arrival_id AND R.user_id = ? AND R.is_canceled = 0) AS SQ3
  ON E.event_id = SQ3.event_id
  WHERE E.event_id = ?`;

/**
 * Retrieves details of events created by the user.
 *
 * Selects: event ID, name, location, host, number of filled spots, total capacity,
 *          start time, end time, description, and user registration status.
 *
 * Conditions:
 *  - Includes only events that the user created.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if the user is registered for each event and has not canceled.
 *
 * Ordering: Events are ordered by their creation time.
 */
const RETRIEVE_USER_CREATED_EVENTS =
  `SELECT E.event_id AS eventId, E.name, E.location, E.host, IFNULL(SQ1.filled, 0) AS filled,
          SQ2.capacity, E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN SQ3.event_id IS NOT NULL
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A.event_id, COUNT(*) AS filled
     FROM Reservations as R, Arrivals as A
     WHERE R.arrival_id = A.arrival_id AND R.is_canceled = 0
     GROUP BY A.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
            CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
              THEN -1
              ELSE SUM(capacity)
            END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN
    (SELECT A.event_id
     FROM Reservations AS R, Arrivals AS A
     WHERE R.arrival_id = A.arrival_id AND R.user_id = ? AND R.is_canceled = 0) AS SQ3
  ON E.event_id = SQ3.event_id
  WHERE E.user_id = ?
  ORDER BY DATETIME(E.timestamp) DESC`;

/**
 * Retrieves details of reservations created by the user.
 *
 * Selects: reservation ID, event ID, name, location, host, number of filled spots, total capacity,
 *          start time, end time, description, and user reservation status.
 *
 * Conditions:
 *  - Includes only reservations that the user created.
 *
 * Sub-queries:
 *  - SQ1: Counts non-canceled reservations to determine filled spots for each event.
 *  - SQ2: Counts total event capacity, treating negative values as unlimited capacity.
 *  - SQ3: Checks if each reservation is active (i.e. not canceled).
 *
 * Ordering: Reservations are ordered by their creation time.
 */
const RETRIEVE_USER_RESERVATIONS =
  `SELECT R.reservation_id AS reservationId, E.event_id AS eventId, E.name,
          E.location, E.host, IFNULL(SQ1.filled, 0) AS filled, SQ2.capacity,
          E.start_time AS startTime, E.end_time AS endTime, E.description,
          CASE WHEN R.is_canceled IS 0
            THEN 'true'
            ELSE 'false'
          END AS isRegistered
  FROM Events AS E
  LEFT JOIN
    (SELECT A1.event_id, COUNT(*) AS filled
     FROM Reservations as R1, Arrivals as A1
     WHERE R1.arrival_id = A1.arrival_id AND R1.is_canceled = 0
     GROUP BY A1.event_id) AS SQ1
  ON E.event_id = SQ1.event_id
  LEFT JOIN
    (SELECT event_id,
     CASE WHEN SUM(CASE WHEN capacity < 0 THEN 1 ELSE 0 END) > 0
       THEN -1
       ELSE SUM(capacity)
     END AS capacity
     FROM Arrivals
     GROUP BY event_id) AS SQ2
  ON E.event_id = SQ2.event_id
  LEFT JOIN Arrivals AS A
  ON E.event_id = A.event_id
  LEFT JOIN Reservations R 
  ON A.arrival_id = R.arrival_id
  LEFT JOIN
    (SELECT R3.reservation_id
     FROM Reservations AS R3,
          Arrivals AS A3
     WHERE R3.arrival_id = A3.arrival_id AND
           R3.user_id = ? AND
           R3.is_canceled = 0) AS SQ3
  ON R.reservation_id = SQ3.reservation_id
  WHERE R.user_id = ?
  ORDER BY DATETIME(R.timestamp) DESC`;

/**
 * Retrieves all arrival options and capacity details for a specific event.
 *
 * Selects: arrival option ID, arrival time, number of filled spots, and total capacity.
 *
 * Conditions:
 * - Includes only arrival options for the event with matching ID.
 *
 * Sub-queries:
 * - R: Returns active reservations (i.e. not canceled).
 *
 * Ordering: Arrival options are ordered by the arrival time.
 */
const RETRIEVE_EVENT_ARRIVALS =
  `SELECT A.arrival_id AS arrivalId, A.arrival_time AS arrivalTime,
          IFNULL(COUNT(R.reservation_id), 0) AS filled, A.capacity
  FROM Arrivals AS A
  LEFT JOIN
    (SELECT * FROM Reservations WHERE is_canceled = 0) AS R
  ON A.arrival_id = R.arrival_id
  WHERE A.event_id = ?
  GROUP BY A.arrival_id, A.arrival_time
  ORDER BY DATETIME(A.arrival_time)`;

/**
 * Retrieves all attendees for a specific event.
 *
 * Selects: username, profile picture, and arrival times.
 *
 * Conditions:
 * - Includes only attendees for the event with matching ID.
 * - Includes only attendees with active reservations (i.e. not canceled).
 *
 * Ordering:
 *  - Orders the attendees alphabetically by username.
 */
const RETRIEVE_EVENT_ATTENDEES =
  `SELECT U.username, U.picture, A.arrival_time AS arrivalTime
  FROM Reservations AS R, Arrivals AS A, Users AS U
  WHERE R.arrival_id = A.arrival_id AND R.user_id = U.user_id AND
        A.event_id = ? AND R.is_canceled = 0
  ORDER BY U.username`;

/**
 * Retrieves the top-5 upcoming events fitting a search query.
 *
 * Selects: event ID, name, and location.
 *
 * Conditions:
 * - Includes only events where the combined string of
 *   'name @ location' contains the provided search term.
 * - Includes only events that have not ended, based on
 *    the event end time and the current local time.
 *
 * Limit:
 *  - Limits the results to the first 5 events that match the criteria.
 */
const RETRIEVE_UPCOMING_EVENTS_FITTING_SEARCH =
  `SELECT event_id AS eventId, name, location
  FROM Events 
  WHERE name || ' @ ' || location LIKE '%' || ? || '%' AND
        DATETIME(end_time) > datetime('now', 'localtime')
  LIMIT 5`;

/**
 * Retrieves details for the arrival option.
 *
 * Selects: arrival option ID, arrival time, number of filled spots, and total capacity.
 *
 * Conditions:
 * - Includes only the arrival option that matches the given id.
 *
 * Sub-queries:
 * - R: Returns active reservations (i.e. not canceled).
 */
const RETRIEVE_ARRIVAL_OPTION_BY_ID =
  `SELECT A.arrival_id AS arrivalId, A.arrival_time AS arrivalTime,
          IFNULL(COUNT(R.reservation_id), 0) AS filled, A.capacity
  FROM Arrivals AS A
  LEFT JOIN
    (SELECT * FROM Reservations WHERE is_canceled = 0) AS R
  ON A.arrival_id = R.arrival_id
  WHERE A.arrival_id = ?
  GROUP BY A.arrival_id`;

/**
 * Retrieves the record in the Users table if they are registered for specified event.
 * Otherwise, retrieves nothing.
 *
 * Conditions:
 * - Only retrieves the user record if they are registered for the specified event.
 */
const RETRIEVE_USER_RECORD_IF_REGISTERED_FOR_EVENT =
  `SELECT U.*
  FROM Reservations AS R, Arrivals AS A, Users AS U
  WHERE R.arrival_id = A.arrival_id AND R.user_id = U.user_id AND
        R.user_id = ? AND A.event_id = ? AND R.is_canceled = 0`;

/**
 * Retrieves the record in the Events table associated with the provided arrival id
 * if it has already ended. Otherwise, retrieves nothing.
 *
 * Conditions:
 * - Only retrieves the event record if it has already ended.
 */
const RETRIEVE_EVENT_RECORD_BY_ARRIVAL_ID_IF_ENDED =
  `SELECT E.*
  FROM Events AS E, Arrivals AS A
  WHERE E.event_id = A.event_id AND A.arrival_id = ? AND
        DATETIME(E.end_time) < datetime('now','localtime')`;

/**
 * Retrieves the record in the Events table if it has already ended.
 * Otherwise, retrieves nothing.
 *
 * Conditions:
 * - Only retrieves the event record if it has already ended.
 */
const RETRIEVE_EVENT_RECORD_BY_EVENT_ID_IF_ENDED =
  `SELECT *
  FROM Events AS E
  WHERE E.event_id = ? AND DATETIME(E.end_time) < datetime('now', 'localtime')`;

/**
 * Retrieves the record in the Users table with matching user ID.
 */
const RETRIEVE_USER_RECORD_BY_ID = `SELECT * FROM Users WHERE user_id = ?`;

/**
 * Retrieves the record in the Users table with matching email.
 */
const RETRIEVE_USER_RECORD_BY_EMAIL = `SELECT * FROM Users WHERE email = ?`;

/**
 * Retrieves the record in the Events table with matching event ID.
 */
const RETRIEVE_EVENT_RECORD_BY_ID = `SELECT * FROM Events WHERE event_id = ?`;

/**
 * Retrieves all active records in the Reservations table (i.e. not canceled)
 * associated with a specified user that are associated with the same event
 * associated with the specified arrival option ID.
 */
const RETRIEVE_DUPLICATE_RESERVATION_RECORD =
  `SELECT R.*
  FROM Reservations AS R, Arrivals AS A1, Arrivals AS A2
  WHERE R.arrival_id = A1.arrival_id AND A2.arrival_id = ? AND
        A1.event_id = A2.event_id AND R.user_id = ? AND
        R.is_canceled = 0`;

/**
 * Retrieves the names of all events a user is registered for that overlap
 * in time with the event associated with a specified arrival option.
 *
 * Selects: concatenated event name and location.
 *
 * Conditions:
 * - Includes only events that overlap. In order for two events A and B to not overlap,
 *   they must satisfy either of these conditions:
 *   1. Event A must end before user is due to arrive for Event B.
 *   2. Event B must end before user is due to arrive for Event A.
 */
const RETRIEVE_CONFLICTING_EVENT =
  `SELECT E.name || ' @ ' || E.location AS name
  FROM Reservations AS R, Arrivals AS A, Events AS E
  WHERE R.arrival_id = A.arrival_id AND A.event_id = E.event_id AND
        R.user_id = ? AND R.is_canceled = 0 AND
        EXISTS(SELECT 1
               FROM Arrivals AS A1, Events AS E1
               WHERE A1.event_id = E1.event_id AND A1.arrival_id = ? AND
                     NOT (E1.end_time <= A.arrival_time OR E.end_time <= A1.arrival_time))`;

/**
 * Creates a record in the Users table, setting the session_token column to null.
 */
const CREATE_USER_RECORD = `INSERT INTO Users VALUES (?, ?, ?, ?, ?, null)`;

/**
 * Creates a record in the Events table, setting the timestamp column to the current time.
 */
const CREATE_EVENT_RECORD =
  `INSERT INTO Events
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`;

/**
 * Creates a record in the Arrivals table.
 */
const CREATE_ARRIVALS_RECORD = `INSERT INTO Arrivals VALUES (?, ?, ?, ?)`;

/**
 * Creates a record in the Reservations table, setting the timestamp column to the current time.
 */
const CREATE_RESERVATIONS_RECORD =
  `INSERT INTO Reservations
   VALUES (?, ?, ?, 0, datetime('now', 'localtime'))`;

/**
 * Sets the is_canceled column for all records in the Reservations table
 * associated with a specified user and a specified event.
 */
const UPDATE_RESERVATIONS_RECORD =
  `UPDATE Reservations
   SET is_canceled = 1
   WHERE user_id = ? AND
         arrival_id IN (SELECT arrival_id
                        FROM Arrivals
                        WHERE event_id = ?)`;

/**
 * Sets the session_token column for the record in the Users table with matching ID.
 */
const UPDATE_USER_SESSION_TOKEN_BY_ID = `UPDATE Users SET session_token = ? WHERE user_id = ?`;

/**
 * Sets the session_token column for the record in the Users table with matching email.
 */
const UPDATE_USER_SESSION_TOKEN_BY_EMAIL = `UPDATE Users SET session_token = ? WHERE email = ?`;

/**
 * Deletes all records in the Reservations table associated with the specified event.
 */
const DELETE_RESERVATIONS_FOR_EVENT =
  `DELETE FROM Reservations
   WHERE arrival_id IN (SELECT arrival_id
                        FROM Arrivals
                        WHERE event_id = ?)`;

/**
 * Deletes all records in the Arrivals table associated with the specified event.
 */
const DELETE_ARRIVALS_FOR_EVENT = `DELETE FROM Arrivals WHERE event_id = ?`;

/**
 * Deletes the record in the Events table with matching ID.
 */
const DELETE_EVENT = `DELETE FROM Events WHERE event_id = ?`;

/**
 * Retrieves the details of all upcoming events and whether the user is registered for each event.
 */
app.post("/events", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];

    if (missing(userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_ALL_UPCOMING_EVENTS, userId);
      await db.close();
      res.type("json").send(events);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the details of the event and whether the user is registered for that event.
 */
app.post("/events/:eventId", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    let eventId = req.params["eventId"];

    if (missing(eventId, userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let db = await getDBConnection();
      let event = await db.get(RETRIEVE_SPECIFIC_EVENT, userId, eventId);

      if (!event) {
        await db.close();
        res.type("text").status(BAD_REQUEST)
          .send("Event does not exist");
      } else {
        event["attendees"] = await db.all(RETRIEVE_EVENT_ATTENDEES, event["eventId"]);
        await db.close();
        res.type("json").send(event);
      }
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the arrival times and corresponding capacities for the event.
 */
app.get("/events/:eventId/arrivals", async function(req, res) {
  try {
    let eventId = req.params["eventId"];

    let db = await getDBConnection();
    let event = await db.get(RETRIEVE_EVENT_RECORD_BY_ID, eventId);

    if (!event) {
      await db.close();
      res.type("text").status(BAD_REQUEST)
        .send("Event does not exist");
    } else {
      let arrivals = await db.all(RETRIEVE_EVENT_ARRIVALS, eventId);
      await db.close();
      res.type("json").send(arrivals);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the ID, name, and location of the top-5 upcoming events fitting a search query.
 */
app.get("/search", async function(req, res) {
  try {
    let query = req.query["query"];

    if (missing(query)) {
      res.type("json").send([]);
    } else {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_UPCOMING_EVENTS_FITTING_SEARCH, query.trim());
      await db.close();
      res.type("json").send(events);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the details of all upcoming events that satisfy the filter
 * (e.g. "open", "unregistered").
 */
app.post("/filter/:filter", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    let filter = req.params["filter"].toLowerCase();

    if (missing(userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else if (filter === "open") {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_OPEN_UPCOMING_EVENTS, userId);
      await db.close();
      res.type("json").send(events);
    } else if (filter === "unregistered") {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_UNREGISTERED_UPCOMING_EVENTS, userId);
      await db.close();
      res.type("json").send(events);
    } else {
      res.type("text").status(BAD_REQUEST)
        .send("Unrecognized filter");
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Creates a new user.
 */
app.post("/auth/create", async function(req, res) {
  try {
    let username = req.body["username"];
    let picture = req.body["picture"];
    let email = req.body["email"];
    let password = req.body["password"];

    if (missing(username, picture, email, password)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else {
      let db = await getDBConnection();
      let userRecord = await db.get(RETRIEVE_USER_RECORD_BY_EMAIL, email);

      if (userRecord) {
        await db.close();
        res.type("text").status(BAD_REQUEST)
          .send(`'${email}' is already in use`);
      } else {
        await db.run(CREATE_USER_RECORD, random(), username, picture, email, password);
        await db.close();
        res.type("text").send(`Successfully created user '${username}'!`);
      }
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Validates the given email and password combination. If valid, generates a new session token and
 * retrieves the ID, session token, username, and picture for the associated user.
 */
app.post("/auth/login", async function(req, res) {
  try {
    let email = req.body["email"];
    let password = req.body["password"];

    if (missing(email, password)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateCredentials(email, password))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let db = await getDBConnection();
      await db.run(UPDATE_USER_SESSION_TOKEN_BY_EMAIL, random(), email);
      let userRecord = await db.get(RETRIEVE_USER_RECORD_BY_EMAIL, email);
      await db.close();
      let data = {
        "userId": userRecord["user_id"],
        "sessionToken": userRecord["session_token"],
        "username": userRecord["username"],
        "picture": userRecord["picture"]
      };
      res.type("json").send(data);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Validates a given user ID and session token combination. If valid, retrieves the
 * ID, session token, username, and picture for the associated user.
 */
app.post("/auth/validate", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];

    if (missing(userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Invalid session token");
    } else {
      let db = await getDBConnection();
      let userRecord = await db.get(RETRIEVE_USER_RECORD_BY_ID, userId);
      await db.close();
      let data = {
        "userId": userRecord["user_id"],
        "sessionToken": userRecord["session_token"],
        "username": userRecord["username"],
        "picture": userRecord["picture"]
      };
      res.type("json").send(data);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Invalidates the user's session token if the given user ID and session token combination is valid.
 * Otherwise does nothing. Responds with a success message in either case.
 */
app.post("/auth/logout", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];

    if (missing(userId)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else {
      if (await authenticateToken(userId, sessionToken)) {
        let db = await getDBConnection();
        await db.run(UPDATE_USER_SESSION_TOKEN_BY_ID, null, userId);
        await db.close();
      }
      res.type("text").send(`Successfully logged out!`);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Creates a new upcoming event.
 */
app.post("/user/create", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    if (missing(req.body["event"])) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else {
      let event = parseCreateEventRequest(req.body["event"]);
      let error = await validateCreateEventRequest(userId, sessionToken, event);
      if (error) {
        res.type("text").status(BAD_REQUEST)
          .send(error);
      } else {
        await createEvent(userId, event);
        res.type("text").send("Successfully created event!");
      }
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Deletes an upcoming event.
 */
app.post("/user/delete", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    let eventId = req.body["eventId"];

    let error = await validateDeleteEventRequest(userId, sessionToken, eventId);
    if (error) {
      res.type("text").status(BAD_REQUEST)
        .send(error);
    } else {
      await deleteEvent(eventId);
      res.type("text").send("Successfully deleted event!");
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Reserves a spot for the user at an upcoming event.
 */
app.post("/user/reserve", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    let arrivalId = req.body["arrivalId"];

    if (missing(userId, sessionToken, arrivalId)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let error = await validateReserveEventRequest(userId, arrivalId);
      if (error) {
        res.type("text").status(BAD_REQUEST)
          .send(error);
      } else {
        let reservationId = random();
        let db = await getDBConnection();
        await db.run(CREATE_RESERVATIONS_RECORD, reservationId, userId, arrivalId);
        await db.close();
        res.type("text").send(`Your reservation ID is #${formatReservationId(reservationId)}`);
      }
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Withdraws the user from an upcoming event.
 */
app.post("/user/withdraw", async function(req, res) {
  try {
    let userId = req.body["userId"];
    let sessionToken = req.body["sessionToken"];
    let eventId = req.body["eventId"];

    if (missing(userId, sessionToken, eventId)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let error = await validateWithdrawEventRequest(userId, eventId);
      if (error) {
        res.type("text").status(BAD_REQUEST)
          .send(error);
      } else {
        let db = await getDBConnection();
        await db.run(UPDATE_RESERVATIONS_RECORD, userId, eventId);
        await db.close();
        res.type("text").send("Successfully withdrawn from event!");
      }
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the details of all events made by the user.
 */
app.post("/:userId/events", async function(req, res) {
  try {
    let userId = req.params["userId"];
    let sessionToken = req.body["sessionToken"];

    if (missing(userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_USER_CREATED_EVENTS, userId, userId);
      await db.close();
      res.type("json").send(events);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Retrieves the details of all reservations made by the user.
 */
app.post("/:userId/history", async function(req, res) {
  try {
    let userId = req.params["userId"];
    let sessionToken = req.body["sessionToken"];

    if (missing(userId, sessionToken)) {
      res.type("text").status(BAD_REQUEST)
        .send("Missing required parameters");
    } else if (!(await authenticateToken(userId, sessionToken))) {
      res.type("text").status(BAD_REQUEST)
        .send("Access denied. Please sign in again");
    } else {
      let db = await getDBConnection();
      let events = await db.all(RETRIEVE_USER_RESERVATIONS, userId, userId);
      await db.close();
      res.type("json").send(events);
    }
  } catch (error) {
    res.type("text").status(INTERNAL_SERVER_ERROR)
      .send("Something went wrong. Please try again");
  }
});

/**
 * Parses the event component of the create event request.
 *
 * @param {string|JSON} event - the event component to be parsed.
 * @returns {JSON} - the parsed event component or the component itself
 *                   if it has already been parsed.
 */
function parseCreateEventRequest(event) {
  try {
    return JSON.parse(event);
  } catch (err) {
    return event;
  }
}

/**
 * Validates the request for creating an event, checking for missing parameters, user
 * authentication and event details. Any errors that occur should be caught in the
 * function that calls this one.
 *
 * @param {string} userId - the ID of the user creating the event.
 * @param {string} sessionToken - the session token for user authentication.
 * @param {Object} event - object containing event details.
 * @returns {Promise<string>} - promise that resolves to an error message if validation
 *                              fails or null if validation is successful.
 */
async function validateCreateEventRequest(userId, sessionToken, event) {
  if (missing(userId, sessionToken, event, event["name"], event["location"], event["host"]) ||
      missing(event["startTime"], event["endTime"], event["description"]) ||
      missingArrivals(event["arrivals"])) {
    return "Missing required parameters";
  } else if (!(await authenticateToken(userId, sessionToken))) {
    return "Access denied. Please sign in again";
  } else if (!validEventTimes(event["startTime"], event["endTime"], event["arrivals"])) {
    return "Unable to parse provided times";
  } else if (!validEventYear(event["startTime"])) {
    return "Event must start in this myriad";
  } else if (!validEventStartTime(event["startTime"])) {
    return "Event cannot start at a past date or time";
  } else if (!validEventEndTime(event["startTime"], event["endTime"])) {
    return "Event start time must be earlier than the event end time";
  } else if (!validEventDuration(event["startTime"], event["endTime"])) {
    return "Event duration must be less than 24 hours";
  } else if (!validEventArrivals(event["startTime"], event["endTime"], event["arrivals"])) {
    return "Arrival time must be within the event times";
  } else if (hasDuplicateEventArrivals(event["arrivals"])) {
    return "Arrival times cannot be identical";
  } else if (!validEventCapacities(event["arrivals"])) {
    return "Capacity must either be a positive integer or -1 for infinite capacity";
  }
  return null;
}

/**
 * Validates the request for deleting an upcoming event, checking for missing parameters, user
 * authentication, event ownership, and event futurity. Any errors that occur should be caught
 * in the function that calls this one.
 *
 * @param {string} userId - the ID of the user attempting to delete the event.
 * @param {string} sessionToken - the session token for user authentication.
 * @param {string} eventId - the ID of the event to be deleted
 * @returns {Promise<string>} - promise that resolves to an error message if validation
 *                              fails or null if validation is successful.
 */
async function validateDeleteEventRequest(userId, sessionToken, eventId) {
  if (missing(userId, sessionToken, eventId)) {
    return "Missing required parameters";
  } else if (!(await authenticateToken(userId, sessionToken))) {
    return "Access denied. Please sign in again";
  }
  let db = await getDBConnection();
  let event = await db.get(RETRIEVE_EVENT_RECORD_BY_ID, eventId);
  let pastEvent = await db.get(RETRIEVE_EVENT_RECORD_BY_EVENT_ID_IF_ENDED, eventId);
  await db.close();

  if (event["user_id"] !== userId) {
    return "You do not have permission to delete this event. It belongs to another user";
  } else if (pastEvent) {
    return "Unable to delete a past event";
  }
  return null;
}

/**
 * Validates the request for reserving an event at a particular arrival time, checking for
 * existence, event futurity, duplicate reservations, spot availability, and time conflicts.
 * Any errors that occur should be caught in the function that calls this one.
 *
 * @param {string} userId - the ID of the user making the reservation.
 * @param {string} arrivalId - the ID of the arrival time to be reserved.
 * @returns {Promise<string>} - promise that resolves to an error message if validation
 *                              fails or null if validation is successful.
 */
async function validateReserveEventRequest(userId, arrivalId) {
  let db = await getDBConnection();
  let arrivalRecord = await db.get(RETRIEVE_ARRIVAL_OPTION_BY_ID, arrivalId);
  let reservationRecord = await db.get(RETRIEVE_DUPLICATE_RESERVATION_RECORD, arrivalId, userId);
  let conflictingEvent = await db.get(RETRIEVE_CONFLICTING_EVENT, userId, arrivalId);
  let pastEvent = await db.get(RETRIEVE_EVENT_RECORD_BY_ARRIVAL_ID_IF_ENDED, arrivalId);
  await db.close();

  if (!arrivalRecord) {
    return "Arrival time does not exist";
  } else if (pastEvent) {
    return `Unable to register for a past event`;
  } else if (reservationRecord) {
    return "Already registered for event";
  } else if (arrivalRecord["filled"] === arrivalRecord["capacity"]) {
    return "Arrival time is fully booked";
  } else if (conflictingEvent) {
    return `You have already reserved '${conflictingEvent["name"]}' for this time. ` +
           "Please withdraw or update your arrival time before proceeding";
  }
  return null;
}

/**
 * Validates the request for withdrawing from an event, checking for event existence,
 * reservation existence, and event futurity. Any errors that occur should be caught
 * in the function that calls this one.
 *
 * @param {string} userId - the ID of the user making the reservation.
 * @param {string} eventId - the ID of the event to withdraw from.
 * @returns {Promise<string>} - promise that resolves to an error message if validation
 *                              fails or null if validation is successful.
 */
async function validateWithdrawEventRequest(userId, eventId) {
  let db = await getDBConnection();
  let eventRecord = await db.get(RETRIEVE_EVENT_RECORD_BY_ID, eventId);
  let reservationRecord = await db.get(
    RETRIEVE_USER_RECORD_IF_REGISTERED_FOR_EVENT,
    userId,
    eventId
  );
  let pastEvent = await db.get(RETRIEVE_EVENT_RECORD_BY_EVENT_ID_IF_ENDED, eventId);
  await db.close();

  if (!eventRecord) {
    return "Event does not exist";
  } else if (!reservationRecord) {
    return "Not registered for this event";
  } else if (pastEvent) {
    return "Unable to withdraw from a past event";
  }
  return null;
}

/**
 * Creates a new event record in the database along with the associated arrival records.
 *
 * @param {string} userId - the ID of the user creating the event.
 * @param {object} event - object containing event details.
 */
async function createEvent(userId, event) {
  let eventId = random();
  let db = await getDBConnection();
  await db.run(
    CREATE_EVENT_RECORD,
    eventId,
    userId,
    event["name"],
    event["location"],
    event["host"],
    event["startTime"],
    event["endTime"],
    event["description"]
  );
  for (const arrival of event["arrivals"]) {
    await db.run(
      CREATE_ARRIVALS_RECORD,
      random(),
      eventId,
      arrival["arrivalTime"],
      arrival["capacity"]
    );
  }
  await db.close();
}

/**
 * Deletes an event and its associated reservation and arrival records.
 *
 * @param {string} eventId - the ID of the event to be deleted.
 */
async function deleteEvent(eventId) {
  let db = await getDBConnection();
  await db.run(DELETE_RESERVATIONS_FOR_EVENT, eventId);
  await db.run(DELETE_ARRIVALS_FOR_EVENT, eventId);
  await db.run(DELETE_EVENT, eventId);
  await db.close();
}

/**
 * Checks if any of the passed arguments are missing
 * (i.e. null, undefined, or empty strings).
 *
 * @param {...Object} args - a list of arguments to be checked for missing values.
 * @returns {boolean} - true if any argument is missing. false otherwise.
 */
function missing(...args) {
  for (const arg of args) {
    if (!arg || arg === "") {
      return true;
    }
  }
  return false;
}

/**
 * Checks if list of JSONs representing arrivals is empty, or if any of the parameters
 * in the list are missing (i.e. null, undefined, or empty strings).
 *
 * @param {Object[]} arrivals - a list of JSONs representing arrivals
 * @returns {boolean} - true if list is empty or any argument is missing. false otherwise.
 */
function missingArrivals(arrivals) {
  if (arrivals.length === 0) {
    return true;
  }
  for (const arrival of arrivals) {
    if (!arrival || arrival === "" ||
        !arrival["arrivalTime"] || arrival["arrivalTime"] === "" ||
        !arrival["capacity"] || arrival["capacity"] === "") {
      return true;
    }
  }
  return false;
}

/**
 * Checks if the provided start time, end time, and arrival times are all valid dates.
 *
 * @param {string} startTime - the event's start time.
 * @param {string} endTime - the event's end time.
 * @param {object[]} arrivals - an array of objects containing arrival times.
 * @returns {boolean} - true if all the times are valid dates. false otherwise.
 */
function validEventTimes(startTime, endTime, arrivals) {
  for (const time of [startTime, endTime, ...arrivals.map(arrival => arrival["arrivalTime"])]) {
    if (isNaN(Date.parse(time))) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if the event's start year is valid (i.e. 4 digits long or before the year 10000).
 *
 * @param {string} startTime - the event's start time.
 * @returns {boolean} - true if the event's start year is valid. false otherwise.
 */
function validEventYear(startTime) {
  return (new Date(Date.parse(startTime)).getFullYear() < MYRIAD_YEARS);
}

/**
 * Checks if the event's start time is in the future.
 *
 * @param {string} startTime - the event's start time.
 * @returns {boolean} - true if the event's start time is in the future. false otherwise.
 */
function validEventStartTime(startTime) {
  return (Date.now() < Date.parse(startTime));
}

/**
 * Checks if the event's end time is after its start time.
 *
 * @param {string} startTime - the event's start time.
 * @param {string} endTime - the event's end time.
 * @returns {boolean} - true if the event's end time is after its start time. false otherwise.
 */
function validEventEndTime(startTime, endTime) {
  return (Date.parse(startTime) < Date.parse(endTime));
}

/**
 * Checks if the duration of the event is no longer than 24 hours.
 *
 * @param {string} startTime - the event's start time.
 * @param {string} endTime - the event's end time.
 * @returns {boolean} - true if the event's duration is less than 24 hours. false otherwise.
 */
function validEventDuration(startTime, endTime) {
  return Math.abs(Date.parse(startTime) - Date.parse(endTime)) < DAY_MILLISECONDS;
}

/**
 * Checks if all arrival times are within the event's start time (inc.) and end time (exc.)
 *
 * @param {string} startTime - the event's start time.
 * @param {string} endTime - the event's end time.
 * @param {object[]} arrivals - an array of objects containing arrival times.
 * @returns {boolean} - true if all arrival times are within the event's start and end times.
 *                      false otherwise.
 */
function validEventArrivals(startTime, endTime, arrivals) {
  startTime = Date.parse(startTime);
  endTime = Date.parse(endTime);
  for (const arrival of arrivals) {
    let arrivalTime = Date.parse(arrival["arrivalTime"]);
    if (!(startTime <= arrivalTime && arrivalTime < endTime)) {
      return false;
    }
  }
  return true;
}

/**
 * Checks that all arrival options have capacity either -1 (infinite capacity) or a positive
 * integer.
 *
 * @param {object[]} arrivals - an array of objects containing arrival option capacities.
 * @returns {boolean} - true if all arrival options have capacity either -1 or a positive integer.
 *                      false otherwise.
 */
function validEventCapacities(arrivals) {
  for (const arrival of arrivals) {
    if (!(/^-1$|^[1-9]\d*$/.test(arrival["capacity"]))) {
      return false;
    }
  }
  return true;
}

/**
 * Checks for duplicate arrival times.
 *
 * @param {object[]} arrivals - an array of objects containing arrival times.
 * @returns {boolean} - true if there are duplicate arrival times. false otherwise
 */
function hasDuplicateEventArrivals(arrivals) {
  let arrivalTimes = new Set();
  for (const arrival of arrivals) {
    let arrivalTime = Date.parse(arrival["arrivalTime"]);
    if (arrivalTimes.has(arrivalTime)) {
      return true;
    }
    arrivalTimes.add(arrivalTime);
  }
  return false;
}

/**
 * Authenticates a user by validating their email and password. Any errors that occur should be
 * caught in the function that calls this one.
 *
 * @param {string} email - the user's email
 * @param {string} password - the password to be validated
 * @returns {Promise<boolean>} - promise that resolves to true if the provided password
 *                               is valid for the given email, and false otherwise.
 */
async function authenticateCredentials(email, password) {
  let db = await getDBConnection();
  let result = await db.get(RETRIEVE_USER_RECORD_BY_EMAIL, email);
  await db.close();

  return (result !== undefined && result["password"] === password);
}

/**
 * Authenticates a user by validating their session token. Any errors that occur should be
 * caught in the function that calls this one.
 *
 * @param {string} userId - the user's identifier
 * @param {string} sessionToken - the session token to be validated
 * @returns {Promise<boolean>} - promise that resolves to true if the provided session token
 *                               is valid for the given user ID, and false otherwise.
 */
async function authenticateToken(userId, sessionToken) {
  let db = await getDBConnection();
  let result = await db.get(RETRIEVE_USER_RECORD_BY_ID, userId);
  await db.close();

  return (result !== undefined && result["session_token"] === sessionToken);
}

/**
 * Generates a random string of digits. Not cryptographically strong in any way.
 *
 * @returns {string} - returns a random string of digits.
 */
function random() {
  let result = "";
  for (let i = 0; i < ID_LENGTH; i++) {
    result += Math.floor(Math.random() * BASE_10);
  }
  return result;
}

/**
 * Formats an ID string by inserting hyphens every four characters.
 *
 * @param {string} id - the ID string to be formatted.
 * @returns {string} - the formatted ID string.
 */
function formatReservationId(id) {
  return id.match(/.{1,4}/g).join('-');
}

/**
 * Establishes a connection to the database. Any errors that occur should be
 * caught in the function that calls this one.
 *
 * @returns {sqlite3.Database} - the database object for the connection.
 */
async function getDBConnection() {
  const db = await sqlite.open({
    filename: "eventure.db",
    driver: sqlite3.Database
  });
  return db;
}

// Tells the code to serve static files in a directory called 'public'
app.use(express.static("public"));

// Specify the port to listen on
const PORT = process.env.PORT || PORT_DEFAULT;

// Tells the application to run on the specified port
app.listen(PORT);
