# Eventure API Documentation
This API offers a comprehensive solution for user management,
event management, and social interaction. It enables users to
create profiles, authenticate, explore various events, make
reservations, organize personal events, and engage in conversations
with fellow attendees.

## Table of Contents
1. [Events](#events)
   1. [Retrieve All Upcoming Events](#retrieve-all-events)
   2. [Retrieve Specific Event](#retrieve-specific-event)
   3. [Retrieve Arrival Times for Specific Event](#retrieve-specific-event-arrivals)
   4. [Retrieve Upcoming Events Fitting Search](#retrieve-search-events)
   5. [Retrieve Upcoming Events Fitting Filter](#retrieve-filter-events)
2. [User Authentication](#auth)
   1. [Create User](#create-user)
   2. [Login User](#login-user)
   3. [Validate User](#validate-user)
   4. [Logout User](#logout-user)
3. [User Event Actions](#actions)
   1. [Create Event](#create-event)
   2. [Delete Event](#delete-event)
   3. [Reserve Event](#reserve-event)
   4. [Withdraw From Event](#withdraw-from-event)
4. [User Information](#data)
   1. [Retrieve User Events](#retrieve-user-events)
   2. [Retrieve User History](#retrieve-user-history)

<a id="events"></a>
## Events

<a id="retrieve-all-events"></a>
### Retrieve All Upcoming Events

**Request Format:** `/events`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns an array of JSON objects containing the details of all upcoming events and
                 whether the user is registered for each event.

**Example Request:** `/events` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```json
[
  {
    "eventId": "5799367309071941",
    "name": "Talent Show",
    "location": "CSE2 G20",
    "host": "SAC",
    "filled": "53",
    "capacity": "120",
    "startTime": "2023-11-05 15:30:00",
    "endTime": "2023-11-05 16:30:00",
    "description": "Lorem ipsum dolor sit amet",
    "isRegistered": "false"
  },
  {
    "eventId": "1315791372551439",
    "name": "Fall Fest",
    "location": "Sylvan Grove",
    "host": "COM2",
    "filled": "547",
    "capacity": "–",
    "startTime": "2023-11-07 17:00:00",
    "endTime": "2023-11-07 20:00:00",
    "description": "Duis aute irure dolor in reprehenderit in voluptate",
    "isRegistered": "true"
  }
]
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="retrieve-specific-event"></a>
### Retrieve Specific Event

**Request Format:** `/events/:eventId`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns a JSON object containing the details of the event and
                 whether the user is registered for that event.

**Example Request:** `/events/5799367309071941` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```json
{
  "eventId": "5799367309071941",
  "name": "Talent Show",
  "location": "CSE2 G20",
  "host": "SAC",
  "filled": "53",
  "capacity": "120",
  "startTime": "2023-11-05 15:30:00", 
  "endTime": "2023-11-05 16:30:00",
  "description": "Lorem ipsum dolor sit amet",
  "isRegistered": "false",
  "attendees": [
    {
      "username": "Jane Doe",
      "picture": "<Base64 encoded image>",
      "arrivalTime": "2023-11-05 15:30:00"
    },
    {
      "username": "John Doe",
      "picture": "<Base64 encoded image>",
      "arrivalTime": "2023-11-05 15:45:00"
    },
    ...
  ]
}
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Non-existent event: `Event does not exist`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="retrieve-specific-event-arrivals"></a>
### Retrieve Arrival Times for Specific Event

**Request Format:** `/events/:eventId/arrivals`

**Request Type:** GET

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns a JSON object containing the arrival times and corresponding capacities for the event. 

**Example Request:** `/events/5799367309071941/arrivals`

**Example Response:**
```json
[
  {
    "arrivalId": "2319489474928911",
    "arrivalTime": "2023-11-05 15:30:00",
    "filled": "80",
    "capacity": "100"
  },
  {
    "arrivalId": "8482847283274748",
    "arrivalTime": "2023-11-05 15:45:00",
    "filled": "5",
    "capacity": "20"
  }
]
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Non-existent event: `Event does not exist`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="retrieve-search-events"></a>
### Retrieve Upcoming Events Fitting Search

**Request Format:** `/search`

**Request Type:** GET

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns an array of JSON objects containing the ID, name, and location of the top-5
                 upcoming events fitting a search query. If clients do not supply the query parameter
                 `query`, then an empty array will be returned.

**Example Request:** `/search?query=Talent`

**Example Response:**
```json
[
  {
    "eventId": "5799367309071941",
    "name": "Talent Show",
    "location": "CSE2 G20"
  },
  {
    "eventId": "4361174637610089",
    "name": "Talented Women in CSE",
    "location": "Zillow Commons"
  }
]
```

**Error Handling:**
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="retrieve-search-events"></a>
### Retrieve Upcoming Events Fitting Filter

**Request Format:** `/filter/:filter`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns an array of JSON objects containing the details of all upcoming events that satisfy
                 the filter. Path parameter `filter` must either be `open` or `unregistered`, showing all
                 available (i.e. has remaining spots available) and unregistered events respectively.

**Example Request 1:** `/filter/open` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response 1:**
```json
[
  {
    "eventId": "5799367309071941",
    "name": "Talent Show",
    "location": "CSE2 G20",
    "host": "SAC",
    "filled": "53",
    "capacity": "120",
    "startTime": "2023-11-05 15:30:00",
    "endTime": "2023-11-05 16:30:00",
    "description": "Lorem ipsum dolor sit amet",
    "isRegistered": "false"
  },
  {
    "eventId": "1315791372551439",
    "name": "Fall Fest",
    "location": "Sylvan Grove",
    "host": "COM2",
    "filled": "547",
    "capacity": "–",
    "startTime": "2023-11-07 17:00:00",
    "endTime": "2023-11-07 20:00:00",
    "description": "Duis aute irure dolor in reprehenderit in voluptate",
    "isRegistered": "true"
  }
]
```

**Example Request 2:** `/filter/unregistered` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response 2:**
```json
[
  {
    "eventId": "9694573724828773",
    "name": "Resume Workshop",
    "location": "CSE2 Undergraduate Commons",
    "host": "CSE Advising",
    "filled": "22",
    "capacity": "22",
    "startTime": "2023-11-05 18:00:00",
    "endTime": "2023-11-05 20:00:00",
    "description": "Sed ut perspiciatis unde omnis iste natus error sit voluptatem",
    "isRegistered": "true"
  }
]
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Unrecognized filter: `Unrecognized filter`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="auth"></a>
## User Authentication


<a id="create-user"></a>
### Create User

**Request Format:** `/auth/create`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Creates a new user and returns a status message.

**Example Request:** `/auth/create` with POST body
```json
{
  "username": "John Doe",
  "picture": "<Base64 encoded image>",
  "email": "john.doe@email.com",
  "password": "1234"
}
```

**Example Response:**
```
Successfully created user 'John Doe'!
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Email already in use: `'{email}' is already in use`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="login-user"></a>
### Login User

**Request Format:** `/auth/login`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Validates the given email and password combination, generates a new session token,
                 and returns a JSON object containing the ID, session token, username, and picture
                 of the associated user.

**Example Request:** `/auth/login` with POST body
```json
{
  "email": "john.doe@email.com",
  "password": "1234"
}
```

**Example Response:**
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "username": "John Doe",
  "picture": "<Base64 encoded image>"
}
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or incorrect credentials: `Access denied. Please sign in again`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="validate-user"></a>
### Validate User

**Request Format:** `/auth/validate`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Validates the given user ID and session token combination and returns a JSON object
                 containing the ID, session token, username, and picture of the associated user.

**Example Request:** `/auth/validate` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "username": "John Doe",
  "picture": "<Base64 encoded image>"
}
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Invalid session token`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`



<a id="logout-user"></a>
### Logout User

**Request Format:** `/auth/logout`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Invalidates the user's session token if the given user ID and session token combination
                 is valid. Otherwise does nothing. Responds with a success message in either case.

**Example Request:** `/auth/logout` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```
Successfully logged out!
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`

<a id="actions"></a>
## User Event Actions

<a id="create-event"></a>
### Create Event

**Request Format:** `/user/create`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Creates a new upcoming event and returns a status message.

**Example Request:** `/user/create` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "event": {
    "name": "Talent Show",
    "location": "CSE2 G20",
    "host": "SAC",
    "startTime": "2023-11-05 15:30:00",
    "endTime": "2023-11-05 16:30:00",
    "description": "Lorem ipsum dolor sit amet",
    "arrivals": [
      {
        "arrivalTime": "2023-11-05 15:30:00",
        "capacity": "100"
      },
      {
        "arrivalTime": "2023-11-05 15:45:00",
        "capacity": "20"
      }
    ]
  }
}
```

**Example Response:**
```
Successfully created event!
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Incorrectly formatted start, end, or arrival times: `Unable to parse provided times`
  - Event start year is past the year 10000: `Event must start in this myriad`
  - Event start time has passed: `Event cannot start at a past date or time`
  - Event start time is same as or later than event end time: `Event start time must be earlier than the event end time`
  - Event duration exceeds 24 hours: `Event duration must be less than 24 hours`
  - Arrival time is not within event times: `Arrival time must be within the event times`
  - Duplicate arrival time options: `Arrival times cannot be identical`
  - Arrival time option has non-integer, non-positive, or non-infinite capacity: `Capacity must either be a positive integer or -1 for infinite capacity`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="delete-event"></a>
### Delete Event

**Request Format:** `/user/delete`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Deletes an upcoming event and returns a status message.

**Example Request:** `/user/delete` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "eventId": "5799367309071941"
}
```

**Example Response:**
```
Successfully deleted event!
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Event does not belong to user: `You do not have permission to delete this event. It belongs to another user`
  - Event has already passed: `Unable to delete a past event`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="reserve-event"></a>
### Reserve Event

**Request Format:** `/user/reserve`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Reserves a spot for the user at an upcoming event and returns a status message.

**Example Request:** `/user/reserve` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "arrivalId": "4458398534853922"
}
```

**Example Response:**
```
Your reservation id is `1234-5678-9101-1121`
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Non-existent arrival time: `Arrival time does not exist`
  - Event has already passed: `Unable to register for a past event`
  - Already registered for event: `Already registered for event`
  - Arrival time is no longer available: `Arrival time is fully booked`
  - Already registered for another event at the same time: `You have already reserved '{reservation} @ {location}' for this time. Please withdraw or update your arrival time before proceeding`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="withdraw-from-event"></a>
### Withdraw From Event

**Request Format:** `/user/withdraw`

**Request Type:** POST

**Returned Data Format:** Plain Text

**Description:** Withdraws the user from an upcoming event and returns a status message.

**Example Request:** `/user/withdraw` with POST body
```json
{
  "userId": "6272689599282621",
  "sessionToken": "5711195633457419",
  "eventId": "5799367309071941"
}
```

**Example Response:**
```
Successfully withdrawn from event!
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
  - Non-existent event: `Event does not exist`
  - Not registered for event: `Not registered for this event`
  - Event has already passed: `Unable to withdraw from a past event`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="data"></a>
## User Information

<a id="retrieve-user-events"></a>
### Retrieve User Events

**Request Format:** `/:userId/events`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns an array of JSON objects containing details of all events made by the user

**Example Request:** `/6272689599282621/events` with POST body
```json
{
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```json
[
  {
    "eventId": "5799367309071941",
    "name": "Talent Show",
    "location": "CSE2 G20",
    "host": "SAC",
    "filled": "53",
    "capacity": "120",
    "startTime": "2023-11-05 15:30:00",
    "endTime": "2023-11-05 16:30:00",
    "description": "Lorem ipsum dolor sit amet",
    "isRegistered": "false",
    "attendees": [
      {
        "username": "Jane Doe",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-05 15:30:00"
      },
      {
        "username": "John Doe",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-05 15:45:00"
      },
      ...
    ]
  },
  {
    "eventId": "1315791372551439",
    "name": "Fall Fest",
    "location": "Sylvan Grove",
    "host": "COM2",
    "filled": "547",
    "capacity": "–",
    "startTime": "2023-11-07 17:00:00",
    "endTime": "2023-11-07 20:00:00",
    "description": "Duis aute irure dolor in reprehenderit in voluptate",
    "isRegistered": "true",
    "attendees": [
      {
        "username": "Jane Applebee",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-07 17:00:00"
      },
      {
        "username": "John Applebee",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-07 17:15:00"
      },
      ...
    ]
  }
]
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`


<a id="retrieve-user-history"></a>
### Retrieve User History

**Request Format:** `/:userId/history`

**Request Type:** POST

**Returned Data Format:** JSON on success, Plain Text on error

**Description:** Returns an array of JSON objects containing details of all reservations made by the user

**Example Request:** `/6272689599282621/history`
```json
{
  "sessionToken": "5711195633457419"
}
```

**Example Response:**
```json
[
  {
    "reservationId": "4383974824457832",
    "eventId": "5799367309071941",
    "name": "Talent Show",
    "location": "CSE2 G20",
    "host": "SAC",
    "filled": "53",
    "capacity": "120",
    "startTime": "2023-11-05 15:30:00",
    "endTime": "2023-11-05 16:30:00",
    "description": "Lorem ipsum dolor sit amet",
    "isRegistered": "true",
    "attendees": [
      {
        "username": "Jane Doe",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-05 15:30:00"
      },
      {
        "username": "John Doe",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-05 15:45:00"
      },
      ...
    ]
  },
  {
    "reservationId": "8243842908429429",
    "eventId": "1315791372551439",
    "name": "Fall Fest",
    "location": "Sylvan Grove",
    "host": "COM2",
    "filled": "547",
    "capacity": "–",
    "startTime": "2023-11-07 17:00:00",
    "endTime": "2023-11-07 20:00:00",
    "description": "Duis aute irure dolor in reprehenderit in voluptate",
    "isRegistered": "false",
    "attendees": [
      {
        "username": "Jane Applebee",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-07 17:00:00"
      },
      {
        "username": "John Applebee",
        "picture": "<Base64 encoded image>",
        "arrivalTime": "2023-11-07 17:15:00"
      },
      ...
    ]
  }
]
```

**Error Handling:**
- Possible 400 errors (all plain text)
  - Missing parameter: `Missing required parameters`
  - Non-existent user, or invalid session token: `Access denied. Please sign in again`
- Possible 500 errors (all plain text)
  - Something goes wrong on the server: `Something went wrong. Please try again`
