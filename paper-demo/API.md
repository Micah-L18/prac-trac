# PracTrac API Documentation

## Overview
RESTful API for volleyball practice management with authentication and team-based data isolation.

## Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "data": <response_data>,
  "message": "Optional message",
  "error": "Error message if success is false"
}
```

## Endpoints

### Authentication

#### `POST /auth/register`
Register a new coach account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coach": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "username": null
    },
    "token": "jwt_token_here"
  }
}
```

#### `POST /auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coach": {
      "id": 1,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "username": "johndoe"
    },
    "token": "jwt_token_here"
  }
}
```

#### `POST /auth/logout`
🔒 Logout and invalidate current session.

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### `GET /auth/me`
🔒 Get current coach profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "createdAt": "2025-10-08T19:00:00.000Z"
  }
}
```

#### `PUT /auth/profile`
🔒 Update coach profile.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "username": "johnsmith"
}
```

### Team Management

#### `GET /teams`
🔒 Get all teams for the authenticated coach.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Varsity Volleyball",
      "season": "2025 Fall",
      "division": "Division 1",
      "description": "High school varsity team",
      "isActive": true,
      "createdAt": "2025-10-08T19:00:00.000Z"
    }
  ]
}
```

#### `POST /teams`
🔒 Create a new team.

**Request Body:**
```json
{
  "name": "JV Volleyball",
  "season": "2025 Fall",
  "division": "JV",
  "description": "Junior varsity team"
}
```

#### `PUT /teams/:id`
🔒 Update team information.

#### `DELETE /teams/:id`
🔒 Soft delete a team.

#### `POST /teams/:id/select`
🔒 Select a team as the active team for the session.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeTeam": {
      "id": 1,
      "name": "Varsity Volleyball",
      "season": "2025 Fall"
    }
  }
}
```

#### `GET /teams/active`
🔒 Get the currently selected active team.

### Player Management

#### `GET /players`
🔒 Get all players for the active team.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "firstName": "Sarah",
      "lastName": "Johnson",
      "jerseyNumber": 12,
      "position": "Outside Hitter",
      "skillLevel": 4,
      "height": "5'8\"",
      "year": "Junior",
      "stats": {
        "kills": 45,
        "blocks": 12,
        "aces": 8,
        "digs": 23,
        "assists": 5
      }
    }
  ]
}
```

#### `POST /players`
🔒 Add a new player to the active team.

**Request Body:**
```json
{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "jerseyNumber": 12,
  "position": "Outside Hitter",
  "skillLevel": 4,
  "height": "5'8\"",
  "year": "Junior"
}
```

#### `GET /players/:id`
🔒 Get specific player details.

#### `PUT /players/:id`
🔒 Update player information.

#### `DELETE /players/:id`
🔒 Remove player from team.

#### `GET /players/:id/attendance`
🔒 Get attendance history for a player.

### Drill Management

#### `GET /drills`
🔒 Get all drills for the authenticated coach.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pepper Drill",
      "category": "Warm-up",
      "duration": 10,
      "difficulty": 2,
      "description": "Basic passing and hitting drill",
      "equipment": ["balls", "net"],
      "minPlayers": 2,
      "maxPlayers": 12,
      "focus": ["passing", "hitting"]
    }
  ]
}
```

#### `POST /drills`
🔒 Create a new drill.

#### `PUT /drills/:id`
🔒 Update drill information.

#### `DELETE /drills/:id`
🔒 Remove a drill.

### Practice Management

#### `GET /practices`
🔒 Get all practice plans for the active team.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Pre-game Practice",
      "date": "2025-10-10",
      "duration": 120,
      "objective": "Prepare for championship game",
      "phases": [
        {
          "id": 1,
          "name": "Warm-up",
          "duration": 15,
          "type": "warm-up",
          "phaseOrder": 1,
          "drills": [1, 2]
        }
      ]
    }
  ]
}
```

#### `POST /practices`
🔒 Create a new practice plan.

#### `PUT /practices/:id`
🔒 Update practice plan.

#### `DELETE /practices/:id`
🔒 Remove practice plan.

#### `GET /practices/:id`
🔒 Get specific practice plan with full details.

### Practice Sessions

#### `GET /practice-sessions`
🔒 Get all practice sessions for the active team.

#### `GET /practice-sessions/active`
🔒 Get currently active practice session.

#### `POST /practice-sessions`
🔒 Start a new practice session.

**Request Body:**
```json
{
  "practiceId": 1,
  "attendance": [
    {"playerId": 1, "attended": true},
    {"playerId": 2, "attended": false, "notes": "Injured"}
  ]
}
```

#### `PUT /practice-sessions/:id`
🔒 Update practice session (pause, resume, complete).

#### `GET /practice-sessions/:id/attendance`
🔒 Get attendance for a specific session.

#### `POST /practice-sessions/:id/notes`
🔒 Add player notes during a session.

**Request Body:**
```json
{
  "playerId": 1,
  "notes": "Great improvement in serving technique",
  "noteType": "practice"
}
```

#### `GET /practice-sessions/:id/notes`
🔒 Get all notes for a session.

### Video Management

#### `GET /videos`
🔒 Get all training videos for the coach.

#### `POST /videos`
🔒 Add a new training video.

#### `PUT /videos/:id`
🔒 Update video information.

#### `DELETE /videos/:id`
🔒 Remove a video.

### Statistics & Analytics

#### `GET /team/stats`
🔒 Get team statistics for the active team.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 12,
    "averageSkillLevel": 3.2,
    "totalPractices": 25,
    "averageAttendance": 0.85,
    "positionBreakdown": {
      "Outside Hitter": 4,
      "Middle Blocker": 3,
      "Setter": 2,
      "Libero": 2,
      "Opposite": 1
    }
  }
}
```

#### `GET /analytics/attendance`
🔒 Get attendance analytics.

#### `GET /analytics/performance`
🔒 Get performance analytics for players.

## Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- General API endpoints: 100 requests per minute per user

## Validation Rules

### Coach Registration
- `firstName`: Required, 1-50 characters
- `lastName`: Required, 1-50 characters  
- `email`: Required, valid email format, unique
- `password`: Required, minimum 8 characters, must contain letters and numbers

### Team Creation
- `name`: Required, 1-100 characters, unique per coach/season
- `season`: Required, 1-50 characters
- `division`: Optional, 1-50 characters

### Player Creation
- `firstName`: Required, 1-50 characters
- `lastName`: Required, 1-50 characters
- `jerseyNumber`: Required, positive integer, unique per team
- `position`: Required, valid volleyball position
- `skillLevel`: Required, integer 1-5
- `height`: Optional, format like "5'8\""
- `year`: Optional, 1-20 characters

🔒 = Requires authentication