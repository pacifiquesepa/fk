# Test Upload Feature - Implementation Guide

## Overview
This guide shows how to integrate the complete test builder system into your FKAMS application. All the necessary files have been created and are ready to be integrated.

## 📁 Files Created

### Database
- `backend/migrations/007_extend_tests_schema.sql` - Database schema updates
- Adds support for new question types (drag, rearrange)
- Creates tables for progress tracking and announcements

### Backend API
- `backend/test-builder-endpoints.js` - Teacher test creation/management endpoints
- `backend/announcements-endpoints.js` - Student notification endpoints

### Frontend Components
- `frontend/src/components/UploadTestSidebar.jsx` - Main test builder UI
- `frontend/src/components/QuestionEditors.jsx` - Question type editors
- `frontend/src/components/TestMonitoring.jsx` - Progress & results views
- `frontend/src/components/Announcements.jsx` - Student notifications

---

## 🚀 Integration Steps

### Step 1: Apply Database Migration

```bash
# Run the migration
mysql -u root -p fkams < backend/migrations/007_extend_tests_schema.sql
```

Or manually in your MySQL client:
1. Open MySQL Workbench or terminal
2. Copy contents of `backend/migrations/007_extend_tests_schema.sql`
3. Execute the SQL

**What this does:**
- Extends `test_questions.question_type` ENUM to include 'drag' and 'rearrange'
- Adds draft support to tests
- Creates `test_progress` table for real-time monitoring
- Creates `announcements` and `announcement_recipients` tables for notifications

---

### Step 2: Integrate Backend Endpoints

**Add to `backend/server.js`:**

```javascript
// Near the end of server.js, before app.listen(), add:

// Import or copy content from backend/test-builder-endpoints.js
// [Copy all the test builder endpoints]

// Import or copy content from backend/announcements-endpoints.js
// [Copy all the announcement endpoints]
```

**Or simpler approach:** Copy-paste all the code from:
- `test-builder-endpoints.js`
- `announcements-endpoints.js`

Into your `server.js` file before the `app.listen()` line.

---

### Step 3: Integrate Frontend Components

#### 3a. Add Components to Your Project

Copy these files to your frontend:
```
frontend/src/components/
  ├── UploadTestSidebar.jsx      (new)
  ├── QuestionEditors.jsx         (new)
  ├── TestMonitoring.jsx          (new)
  └── Announcements.jsx           (new)
```

#### 3b. Update TeacherDashboardPage.jsx

Add the Upload Test action to the dashboard:

```javascript
// At the top of frontend/src/pages/TeacherDashboardPage.jsx, add import:
import UploadTestSidebar from '../components/UploadTestSidebar';

// In the TeacherDashboardPage component, add state:
const [showUploadTest, setShowUploadTest] = useState(false);

// In the actions array, add:
['Upload Test', Upload, 'Create and manage tests for your students.', 'upload_test', 'emerald']

// Handle the 'upload_test' navigation:
const handleNavigate = (target) => {
  if (target === 'upload_test') {
    setShowUploadTest(true);
    return;
  }
  // ... existing navigation code
};

// Add this to the JSX (before closing main div):
{showUploadTest && (
  <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
    <UploadTestSidebar
      t={t}
      onClose={() => setShowUploadTest(false)}
      classId={/* teacher's class ID */}
      subjectId={/* teacher's subject ID */}
    />
  </div>
)}
```

You'll need to get the teacher's assigned classId and subjectId from the dashboard data.

#### 3c. Add Announcements to Headers/Navigation

Add notification bell to your main header/navigation:

```javascript
// In your main layout/header component, add:
import { AnnouncementBell } from '../components/Announcements';

// In the header JSX:
<AnnouncementBell t={t} />
```

#### 3d. Add Test Announcements Widget to Dashboards

Add to student dashboard:

```javascript
import { TestAnnouncementList } from '../components/Announcements';

// In the JSX:
<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
  <h2 className="font-display text-base font-bold text-slate-800 mb-4">
    Test Announcements
  </h2>
  <TestAnnouncementList t={t} />
</div>
```

---

## 📋 API Endpoints Reference

### Teacher Endpoints

#### Create Test Draft
```
POST /api/teacher/tests/draft
Body: {
  title: string,
  description?: string,
  durationMinutes: number,
  classId: number,
  subjectId: number
}
```

#### Get All Drafts
```
GET /api/teacher/tests/drafts
```

#### Get Single Test with Questions
```
GET /api/teacher/tests/:id/draft
```

#### Update Test Details
```
PUT /api/teacher/tests/:id
Body: {
  title?: string,
  description?: string,
  durationMinutes?: number,
  startsAt?: datetime,
  endsAt?: datetime
}
```

#### Add Question
```
POST /api/teacher/tests/:id/questions
Body: {
  prompt: string,
  questionType: 'choice'|'fill'|'match'|'drag'|'rearrange',
  options: any[],
  answer: any[],
  points: number
}
```

#### Delete Question
```
DELETE /api/teacher/tests/:id/questions/:questionId
```

#### Publish Test
```
POST /api/teacher/tests/:id/publish
```

#### Get Test Progress
```
GET /api/teacher/tests/:id/progress
```

#### Get Test Results
```
GET /api/teacher/tests/:id/results
```

### Student Endpoints

#### Get Announcements
```
GET /api/announcements
```

#### Get Unread Count
```
GET /api/announcements/unread/count
```

#### Mark as Read
```
PATCH /api/announcements/:id/read
```

#### Mark All as Read
```
PATCH /api/announcements/read-all
```

---

## 🎨 UI Features Overview

### Teachers

**Test Builder Sidebar**
- Create new test drafts
- Multi-step wizard (Overview → Build → Review → Publish)
- Add questions of 5 types:
  - Multiple Choice
  - Fill in Gap
  - Matching
  - Drag & Drop
  - Rearrange
- Review all questions before publishing
- Edit/delete questions

**Test Monitoring**
- Real-time view of students taking tests
- Auto-refresh every 5 seconds
- Statistics (total, completed, in progress, expired)

**Test Results**
- View all student scores
- Sort by score, name, or date
- Score distribution chart
- Average, highest, lowest scores

### Students

**Announcements Bell**
- Badge with unread count
- Dropdown panel with recent announcements
- Mark announcements as read

**Test Upload Notifications**
- Immediate notification when teacher publishes test
- Easy access to new tests
- View test details before starting

---

## 🔧 Customization Tips

### Change Colors/Styling

All components use Tailwind CSS. To customize:
1. Modify the color classes (e.g., `bg-cyan-700` → `bg-blue-700`)
2. Update the tone values in action cards
3. Adjust spacing and sizes as needed

### Add More Question Types

To add a new question type:
1. Update `question_type` ENUM in database
2. Create new editor component (follow pattern in QuestionEditors.jsx)
3. Add to `componentMap` in QuestionCreator
4. Add to `QuestionTypeSelector` types array

### Custom Validation

Modify validation in question editors:
- Update error messages
- Add new validation rules
- Change point ranges

---

## 🧪 Testing Checklist

- [ ] Database migration runs without errors
- [ ] Backend API endpoints respond correctly
- [ ] Teacher can create test draft
- [ ] Teacher can add questions of all types
- [ ] Teacher can publish test
- [ ] Students receive announcement when test is published
- [ ] Students can start and submit test
- [ ] Teacher can monitor students taking test
- [ ] Teacher can view test results and scores
- [ ] Score chart displays correctly
- [ ] Announcements appear in student notification bell

---

## 🐛 Troubleshooting

### Components Not Showing
- Check imports are correct
- Verify classId and subjectId are passed properly
- Check browser console for errors

### API Endpoints 404
- Ensure endpoints are added to server.js
- Check endpoint paths match exactly
- Verify authentication middleware is applied

### Styling Issues
- Ensure Tailwind CSS is compiled
- Check lucide-react icons are imported
- Verify color classes exist in Tailwind config

### Database Errors
- Run migration script
- Check ENUM values are correct
- Verify foreign key relationships

---

## 📚 Component Props

### UploadTestSidebar
```typescript
{
  t: object,              // i18n translations
  onClose: () => void,   // Called when sidebar closes
  classId: number,        // Teacher's class
  subjectId: number       // Teacher's subject
}
```

### TestProgressMonitor
```typescript
{
  test: object,          // Test object with { id, title }
  onBack: () => void,    // Back button handler
  t: object              // i18n translations
}
```

### TestResultsPage
```typescript
{
  test: object,          // Test object
  onBack: () => void,    // Back button handler
  t: object              // i18n translations
}
```

### AnnouncementBell
```typescript
{
  t: object              // i18n translations
}
```

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review the component source code
3. Test endpoints with Postman/Thunder Client
4. Check browser console and server logs

---

## 🎯 Next Steps

1. ✅ Copy all files to your project
2. ✅ Apply database migration
3. ✅ Add endpoints to server.js
4. ✅ Integrate components into your pages
5. ✅ Test all functionality
6. ✅ Deploy to production

**Total implementation time: ~2-3 hours**
