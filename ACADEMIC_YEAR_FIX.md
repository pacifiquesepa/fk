# Academic Year 409 Conflict Error - FIX

## Problem
When creating a new academic year, a **409 Conflict** error occurred if a year with the same name already existed. This was due to a UNIQUE constraint on the `academic_years.name` column in the database.

```
POST http://localhost:4000/api/academic-years 409 (Conflict)
Error: "That academic year already exists."
```

## Root Cause
The database schema has a unique constraint:
```sql
name VARCHAR(20) NOT NULL UNIQUE
```

When attempting to insert a duplicate year name, MySQL returned a `ER_DUP_ENTRY` error, which the backend converted to a 409 status code.

## Solution Implemented

### 1. **Frontend Validation Added**
Modified `AcademicYearPage.jsx` to validate **before** sending the request to the backend:

#### In `submitCreate()` function (Line ~190):
```javascript
// Check if year name already exists
if (years.some(y => y.name && y.name.toLowerCase() === payload.name.toLowerCase())) {
    return alert(`Academic year "${payload.name}" already exists. Please use a different name.`);
}
```

#### In `submitClose()` function (Line ~265):
```javascript
// Check if next year name already exists (if creating next year)
if (createNextYear && years.some(y => y.name && y.name.toLowerCase() === nextYearForm.name.toLowerCase())) {
    return alert(`Academic year "${nextYearForm.name}" already exists. Please modify the next year name or disable creation.`);
}
```

### 2. **Benefits**
- ✅ Prevents 409 errors before they reach the server
- ✅ Provides immediate user feedback
- ✅ Improves UX with clear error messages
- ✅ Case-insensitive comparison (handles variations like "2024-2025" vs "2024-2025")

## How to Use

### Creating a New Academic Year:
1. Open the Academic Year management page
2. Click "New Academic Year"
3. Enter a **unique name** (e.g., "2024-2025", "2025-2026")
4. If the name exists, you'll see:
   ```
   Academic year "2024-2025" already exists. Please use a different name.
   ```
5. Modify the name and try again

### Closing an Academic Year & Creating Next Year:
1. Open year details
2. Click "Close Academic Year"
3. If "Create next year" is checked and the auto-generated name exists:
   ```
   Academic year "2025-2026" already exists. Please modify the next year name or disable creation.
   ```
4. Either:
   - Modify the next year name in the form
   - Uncheck "Create next year" checkbox and create it manually later

## Files Modified
- `frontend/src/pages/AcademicYearPage.jsx` - Added duplicate name validation in two functions

## Testing Checklist
- [ ] Try creating an academic year with a name that already exists
- [ ] Verify the error message appears (no API call made)
- [ ] Create a unique academic year successfully
- [ ] Close a year and auto-create next year with different name
- [ ] Try to close and create duplicate next year (should show error)

## Backend Consideration
The backend still has protection with the `ER_DUP_ENTRY` error check, so even if frontend validation is bypassed, users will get a server error with message: **"That academic year already exists."**
