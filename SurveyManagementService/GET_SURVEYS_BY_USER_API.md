# Get All Surveys Created by a User - API Documentation

## ✅ NEW Endpoint Added

### **Get All Surveys by Conductor**

**Endpoint:** `GET /api/v1/surveys/conductor/:conductor_id`

**Description:** Retrieves all surveys created by a specific conductor/user

**Authentication:** Required (Bearer Token or Cookie)

**Authorization:** Any authenticated user (no specific role required)

---

## Request

### HTTP Method
```
GET
```

### URL
```
http://localhost:3001/api/v1/surveys/conductor/{conductor_id}
```

### Headers
```
Authorization: Bearer <your_jwt_token>
Accept: application/json
```

OR (if using cookies from AuthService):
```
Cookie: accessToken=<your_token>
Accept: application/json
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `conductor_id` | integer | Yes | The ID of the conductor whose surveys you want to retrieve |

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Surveys retrieved successfully",
  "data": [
    {
      "survey_id": 1,
      "title": "Customer Satisfaction Survey",
      "description": "A survey to measure customer satisfaction",
      "is_self_recruitment": true,
      "conductor_id": 3,
      "status": "PUBLISHED",
      "created_at": "2025-11-13T10:30:00Z",
      "updated_at": "2025-11-13T11:00:00Z",
      "questions": [...]
    },
    {
      "survey_id": 2,
      "title": "Employee Engagement Survey",
      "description": "Annual employee engagement survey",
      "is_self_recruitment": false,
      "conductor_id": 3,
      "status": "DRAFT",
      "created_at": "2025-11-13T14:20:00Z",
      "updated_at": "2025-11-13T14:45:00Z",
      "questions": [...]
    }
  ],
  "statusCode": 200
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Invalid conductor ID",
  "error": {
    "message": "Invalid conductor ID",
    "code": "BAD_REQUEST"
  },
  "statusCode": 400
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized",
  "error": {
    "message": "Missing or invalid authentication token",
    "code": "UNAUTHORIZED"
  },
  "statusCode": 401
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve surveys",
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_ERROR"
  },
  "statusCode": 500
}
```

---

## Usage Examples

### Example 1: Using cURL with Bearer Token

```bash
curl -X GET \
  'http://localhost:3001/api/v1/surveys/conductor/3' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

### Example 2: Using cURL with Cookies

```bash
curl -X GET \
  'http://localhost:3001/api/v1/surveys/conductor/3' \
  -H 'Cookie: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Accept: application/json'
```

### Example 3: Using JavaScript/Fetch (Frontend)

```javascript
// Get conductor ID from current user
const conductorId = 3; // Replace with actual conductor ID

// Call via AuthService proxy
const response = await fetch(`http://localhost:5171/api/SurveyProxy/surveys/conductor/${conductorId}`, {
  method: 'GET',
  headers: {
    'Accept': 'application/json'
  },
  credentials: 'include' // Include cookies
});

const result = await response.json();
if (result.success) {
  const surveys = result.data;
  console.log('User surveys:', surveys);
}
```

### Example 4: Using Axios (Frontend)

```javascript
import axios from 'axios';

const conductorId = 3;

try {
  const response = await axios.get(
    `http://localhost:5171/api/SurveyProxy/surveys/conductor/${conductorId}`,
    {
      withCredentials: true,
      headers: {
        'Accept': 'application/json'
      }
    }
  );
  
  console.log('Surveys:', response.data.data);
} catch (error) {
  console.error('Error fetching surveys:', error.response?.data);
}
```

---

## How to Get Conductor ID

The conductor ID is assigned when a user registers as a conductor. You can get it from:

### Option 1: From Current Conductor Endpoint

```bash
GET http://localhost:5171/api/Conductor/current
```

Response:
```json
{
  "success": true,
  "data": {
    "conductorId": 3,
    "userId": 3,
    "name": "John Doe",
    "conductorType": 0,
    "contactEmail": "john@example.com",
    ...
  }
}
```

### Option 2: From Auth Context (Frontend)

```javascript
// Assuming you have user context with conductor information
const { user, conductor } = useAuth();
const conductorId = conductor?.conductorId;
```

---

## Complete API Flow

### Step 1: Login & Get Conductor Info

```javascript
// 1. Login
const loginResponse = await authService.login(username, password);

// 2. Get conductor info
const conductorResponse = await fetch('http://localhost:5171/api/Conductor/current', {
  credentials: 'include'
});
const conductorData = await conductorResponse.json();
const conductorId = conductorData.data.conductorId;
```

### Step 2: Fetch User's Surveys

```javascript
// 3. Get all surveys created by this conductor
const surveysResponse = await fetch(
  `http://localhost:3001/api/v1/surveys/conductor/${conductorId}`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}` // or use credentials: 'include'
    }
  }
);
const surveys = await surveysResponse.json();
```

---

## Related Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/surveys/:id` | GET | Get a single survey by ID |
| `/api/v1/surveys/:id/progress` | GET | Get survey progress |
| `/api/v1/surveys/:id/publish` | POST | Publish a survey |
| `/api/v1/surveys/conductor/:conductor_id` | GET | **Get all surveys by conductor** (NEW) |
| `/api/v1/drafts` | POST | Create a new draft |
| `/api/v1/drafts/:id` | GET | Get a draft by ID |
| `/api/v1/drafts/:id` | PUT | Update a draft |
| `/api/v1/drafts/:id/publish` | POST | Publish a draft as a survey |

---

## Notes

1. **Authentication Required:** All survey endpoints require authentication via Bearer token or cookie
2. **Conductor ID:** Must be a valid conductor ID from the database
3. **Empty Results:** If conductor has no surveys, returns empty array `[]`
4. **Survey Status:** Surveys can be in "DRAFT" or "PUBLISHED" status
5. **Questions Included:** Each survey includes its associated questions in the response

---

## Testing

### Test with the Admin Account

```bash
# 1. Login as admin to get conductor ID
curl -X POST http://localhost:5171/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'

# 2. Get admin's conductor info (if registered as conductor)
curl -X GET http://localhost:5171/api/Conductor/current \
  -H 'Cookie: accessToken=<token_from_step_1>'

# 3. Get all surveys by conductor ID
curl -X GET http://localhost:3001/api/v1/surveys/conductor/1 \
  -H 'Authorization: Bearer <token_from_step_1>'
```

---

## Summary

✅ **Endpoint:** `GET /api/v1/surveys/conductor/:conductor_id`  
✅ **Purpose:** Get all surveys created by a specific user/conductor  
✅ **Authentication:** Required  
✅ **Returns:** Array of surveys with all details  
✅ **Status:** Implemented and ready to use!

This endpoint completes the missing functionality to retrieve surveys by creator!

