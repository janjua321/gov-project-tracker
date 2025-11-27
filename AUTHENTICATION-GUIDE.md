# Multi-User Authentication System

## Overview

The system now supports **simultaneous login** for multiple users (Employer and Contractor) without needing to switch the backend. Each user maintains their own authenticated session with their organization's blockchain identity.

## How It Works

### 1. **Session-Based Authentication**
- Each user logs in with their role (Employer/Contractor)
- Backend creates a unique session ID for each user
- Session ID is stored in `localStorage` and sent with every API request via `X-Session-Id` header
- Backend uses the session to determine which blockchain identity to use for transactions

### 2. **Blockchain Identity Management**
- When a user logs in, the backend loads their organization's admin identity from the `crypto-config` folder
- Each identity has:
  - **Certificate**: Public key certificate from the CA
  - **Private Key**: For signing transactions
  - **MSP ID**: Organization identifier (EmployerMSP, ContractorMSP, etc.)

### 3. **Per-Request Organization Switching**
- When an authenticated request comes in, the backend:
  1. Extracts the session ID from headers
  2. Looks up which organization the user belongs to
  3. Switches the Fabric Gateway connection to that organization's identity
  4. Executes the blockchain transaction
  5. Returns the result

## Login Flow

### Frontend (index.html)
```
1. User selects role (Employer/Contractor)
2. Clicks "Continue"
3. Frontend calls POST /api/auth/login with organization
4. Backend creates session and returns sessionId
5. Frontend stores sessionId in localStorage
6. User is redirected to their dashboard
```

### API Endpoint
```javascript
POST /api/auth/login
Body: { "organization": "Employer" | "Contractor" | "Engineer" }

Response: {
    "success": true,
    "sessionId": "abc123...",
    "user": {
        "organization": "Employer",
        "mspId": "EmployerMSP",
        "role": "employer"
    }
}
```

## Making Authenticated Requests

### Using the API Utility (Recommended)
```javascript
// Include the api.js file
<script src="/js/api.js"></script>

// Check authentication on page load
await checkAuth();

// Make authenticated requests
const projects = await apiGet('/api/projects');
const result = await apiPost('/api/projects', {
    projectId: 'PROJ001',
    name: 'My Project',
    description: 'Description',
    totalValue: 1000000
});

// Logout
await logout();
```

### Manual Request
```javascript
const sessionId = localStorage.getItem('sessionId');

fetch('http://localhost:3000/api/projects', {
    method: 'GET',
    headers: {
        'X-Session-Id': sessionId,
        'Content-Type': 'application/json'
    }
});
```

## Testing Multiple Users Simultaneously

### Option 1: Different Browsers
1. Open **Chrome**: Login as Employer
2. Open **Firefox**: Login as Contractor
3. Both can perform actions independently

### Option 2: Incognito/Private Windows
1. **Normal window**: Login as Employer
2. **Incognito window**: Login as Contractor

### Option 3: Different Browser Profiles
1. Create separate Chrome profiles
2. Each profile has its own localStorage

## No More Command-Line Switching!

### ❌ Old Way (Not Needed Anymore)
```bash
# Don't do this anymore
./switch-to-contractor.sh
curl -X POST http://localhost:3000/api/switch-org -d '{"organization":"Contractor"}'
```

### ✅ New Way
Just login through the web interface! The backend handles everything automatically.

## Architecture

```
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│  Employer   │        │   Backend    │        │   Blockchain    │
│  Browser    │───────▶│   Server     │───────▶│   Network       │
│ (Session A) │        │              │        │  (EmployerMSP)  │
└─────────────┘        │              │        └─────────────────┘
                       │              │
┌─────────────┐        │              │        ┌─────────────────┐
│ Contractor  │        │              │        │   Blockchain    │
│  Browser    │───────▶│              │───────▶│   Network       │
│ (Session B) │        │              │        │ (ContractorMSP) │
└─────────────┘        └──────────────┘        └─────────────────┘
```

## API Routes

### Authentication Routes
- `POST /api/auth/login` - Login with organization
- `POST /api/auth/logout` - Logout and destroy session
- `GET /api/auth/status` - Check if session is valid

### Protected Routes (Require Authentication)
- `POST /api/projects` - Create project (Employer only)
- `POST /api/projects/:id/accept` - Accept project (Contractor only)

### Public Routes (No Authentication)
- `GET /api/projects` - View all projects
- `GET /api/projects/:id` - View specific project
- `GET /api/history/complete/:id` - View project history

## Session Storage

Sessions are stored in-memory on the backend (in a Map). For production, use:
- **Redis** - For distributed/scalable sessions
- **Database** - For persistent sessions
- **JWT tokens** - For stateless authentication

## Security Considerations

### Current Implementation (Development)
- ✅ Session-based authentication
- ✅ Organization-level access control
- ✅ Blockchain identity management
- ⚠️ In-memory session storage (lost on server restart)
- ⚠️ No HTTPS (development only)
- ⚠️ Simple session IDs

### Production Recommendations
- Use HTTPS for all connections
- Implement Redis/database for session storage
- Add session expiration/timeout
- Use secure, cryptographically random session IDs
- Add rate limiting
- Implement JWT with proper signing
- Add CORS restrictions
- Add input validation and sanitization

## Example Usage

### Employer Creates Project
```javascript
// Employer logs in
await apiPost('/api/auth/login', { organization: 'Employer' });

// Creates a project (uses EmployerMSP identity automatically)
const result = await apiPost('/api/projects', {
    projectId: 'PROJ001',
    name: 'Highway Construction',
    description: 'New highway project',
    totalValue: 50000000
});
```

### Contractor Accepts Project
```javascript
// Contractor logs in (different browser/session)
await apiPost('/api/auth/login', { organization: 'Contractor' });

// Accepts the project (uses ContractorMSP identity automatically)
const result = await apiPost('/api/projects/PROJ001/accept', {});
```

## Troubleshooting

### "Not authenticated" error
- Check if sessionId exists in localStorage
- Verify session hasn't expired
- Try logging out and logging back in

### "Access denied" error
- Make sure you're logged in with the correct role
- Employers can only create projects
- Contractors can only accept projects

### Session lost after server restart
- This is expected in development (in-memory storage)
- Just logout and login again
- In production, use Redis/database

## Files Changed

### Backend
- `src/middleware/authMiddleware.js` - Session management
- `src/routes/authRoutes.js` - Login/logout endpoints
- `src/controllers/projectController.js` - Uses authenticated user
- `server.js` - Added auth routes

### Frontend
- `frontend/js/api.js` - Utility functions for authenticated requests
- `frontend/index.html` - Updated login flow
- Both dashboards should use `api.js` for requests

## Next Steps

To use this in your dashboards:

1. **Include the API utility**:
```html
<script src="/js/api.js"></script>
```

2. **Check authentication on load**:
```javascript
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuth(); // Redirects to login if not authenticated
    // Load dashboard data
});
```

3. **Make authenticated requests**:
```javascript
const projects = await apiGet('/api/projects');
```

4. **Add logout button**:
```html
<button onclick="logout()">Logout</button>
```
