# Role-Based UI System

## Overview
Complete role-based authentication system with separate dashboards for Employers and Contractors.

## Architecture

### Authentication Flow
```
User → Login Page (/) → Role Selection (Employer/Contractor) → Dashboard
```

### Role Separation
- **Employers**: Can create projects but CANNOT accept contracts
- **Contractors**: Can accept projects but CANNOT create projects

## Files Created/Modified

### Frontend Files

#### 1. `/application/frontend/index.html` - Login Page
- **Purpose**: Role selection and authentication gateway
- **Features**:
  - Two role cards: Employer 🏛️ and Contractor 🏗️
  - Stores selected role in `sessionStorage`
  - Redirects to appropriate dashboard
  - Auto-redirects if already logged in

#### 2. `/application/frontend/employer-dashboard.html` - Employer Dashboard
- **Purpose**: Project creation interface for employers
- **Features**:
  - Create new projects with blockchain integration
  - View all projects on Channel 1
  - Form fields: Project ID, Name, Description, Total Value
  - Real-time project list with status badges
  - API Integration: POST `/api/projects`, GET `/api/projects`
- **Access Control**: Redirects to login if role !== 'employer'

#### 3. `/application/frontend/contractor-dashboard.html` - Contractor Dashboard
- **Purpose**: Project acceptance interface for contractors
- **Features**:
  - View all available projects from blockchain
  - Accept projects with one-click button
  - Shows project status, budget, employer details
  - Disabled accept button for already-assigned projects
  - API Integration: GET `/api/projects`, POST `/api/projects/:id/accept`
- **Access Control**: Redirects to login if role !== 'contractor'

### Backend Files

#### 4. `/blockchain-contracting-system/chaincode/project-management/lib/project-contract.js`
- **New Function Added**: `acceptProject(ctx, projectId)`
- **Purpose**: Allows ContractorMSP to accept projects on blockchain
- **Access Control**: Only ContractorMSP can execute
- **Logic**:
  - Validates project exists and is in CREATED status
  - Checks project not already assigned
  - Updates project.contractor and project.status to 'ACCEPTED'
  - Emits 'ProjectAccepted' event
- **Modification**: Added `contractor: 'Not Assigned'` to createProject function

#### 5. `/application/backend/src/controllers/projectController.js`
- **New Function Added**: `acceptProject(req, res)`
- **Purpose**: API endpoint handler for project acceptance
- **HTTP Method**: POST
- **Endpoint**: `/api/projects/:projectId/accept`
- **Calls**: `fabricService.invokeChaincode('acceptProject', 'channel1', projectId)`

#### 6. `/application/backend/src/routes/projectRoutes.js`
- **New Route**: `router.post('/projects/:projectId/accept', projectController.acceptProject)`

## API Endpoints

### Project Management

#### Create Project (Employer Only)
```http
POST /api/projects
Content-Type: application/json

{
  "projectId": "INFRA_2025_001",
  "name": "Highway Development Project",
  "description": "Multi-lane highway construction",
  "totalValue": 30000000000
}
```

#### Get All Projects (Public)
```http
GET /api/projects
```

#### Accept Project (Contractor Only)
```http
POST /api/projects/INFRA_2025_001/accept
```

## Blockchain Functions

### Channel 1 (Project Management)

#### `createProject(projectId, name, description, totalValue)`
- **Access**: EmployerMSP only
- **Creates**: Project with status 'CREATED' and contractor 'Not Assigned'
- **Returns**: JSON string of created project

#### `acceptProject(projectId)`
- **Access**: ContractorMSP only
- **Updates**: project.contractor = ContractorMSP, status = 'ACCEPTED'
- **Validation**: 
  - Project must exist
  - Status must be 'CREATED'
  - Contractor must be 'Not Assigned'
- **Returns**: JSON string of updated project

#### `queryAllProjects()`
- **Access**: Any organization
- **Returns**: Array of all projects with pagination

## Session Storage Schema

```javascript
sessionStorage.setItem('userRole', 'employer'); // or 'contractor'
```

## UI Components

### Status Badges
- `CREATED`: Blue badge (project available for acceptance)
- `ACCEPTED`: Orange badge (contractor assigned)
- `IN_PROGRESS`: Orange badge (work ongoing)
- `COMPLETED`: Green badge (project finished)

### Navigation
- Role badge showing current user role
- Logout button (clears sessionStorage and redirects to login)

## Security Features

1. **Client-Side Role Checking**:
   - All dashboards check `sessionStorage.userRole` on load
   - Redirects to login page if role doesn't match

2. **Blockchain Access Control**:
   - MSP-based validation in chaincode
   - createProject: EmployerMSP only
   - acceptProject: ContractorMSP only

3. **Role Separation**:
   - Employers cannot access contractor-dashboard.html
   - Contractors cannot access employer-dashboard.html

## Usage Flow

### Employer Workflow
1. Navigate to `http://localhost:3000`
2. Click "Employer" card
3. Dashboard loads with create project form
4. Fill in project details and submit
5. Project is created on blockchain with status 'CREATED'
6. View project in projects list

### Contractor Workflow
1. Navigate to `http://localhost:3000`
2. Click "Contractor" card
3. Dashboard loads with available projects
4. Review project details (budget, description, employer)
5. Click "Accept Project" button
6. Confirm acceptance
7. Project status updates to 'ACCEPTED' on blockchain
8. Button changes to "✅ Project Accepted"

## Testing Checklist

- [ ] Login page displays both role options
- [ ] Employer can create projects
- [ ] Contractor can view all projects
- [ ] Contractor can accept available projects
- [ ] Employer cannot access contractor dashboard
- [ ] Contractor cannot access employer dashboard
- [ ] Logout clears session and returns to login
- [ ] Projects display correct status badges
- [ ] Accept button disabled after project accepted
- [ ] Blockchain transactions complete successfully

## Future Enhancements

### Planned Features
1. **Public Viewer Dashboard**: Citizens can view project history without login
2. **Work Package Submission**: Contractors submit work for certification
3. **Engineer Certification**: Engineers certify completed work packages
4. **Payment Approval**: Employers approve payments based on certifications
5. **Multi-Channel History**: View complete audit trail across all 3 channels

### Security Improvements
1. JWT-based authentication instead of sessionStorage
2. Server-side role validation middleware
3. Certificate-based identity management
4. Rate limiting on API endpoints

## Notes

- Current implementation uses sessionStorage (client-side only)
- For production, implement server-side authentication with JWT
- Blockchain MSP IDs must match organization names (EmployerMSP, ContractorMSP)
- Chaincode must be deployed/upgraded to include new acceptProject function

## Deployment Steps

1. **Upgrade Chaincode** (if already deployed):
   ```bash
   cd blockchain-contracting-system/network
   # Package chaincode with new version
   # Install, approve, and commit new version
   ```

2. **Start Backend**:
   ```bash
   cd application/backend
   npm install
   node server.js
   ```

3. **Access Frontend**:
   - Open browser to `http://localhost:3000`
   - Select role and test workflow

## Troubleshooting

### "Access denied: Only Contractor organization can accept projects"
- Backend is using EmployerMSP identity
- Need to enroll ContractorMSP user in fabricMultiChannelService

### "Project already assigned"
- Project has already been accepted by another contractor
- Check project status with GET `/api/projects/:projectId`

### Cannot access dashboard after login
- Check browser console for JavaScript errors
- Verify sessionStorage contains 'userRole'
- Check if backend server is running on port 3000
