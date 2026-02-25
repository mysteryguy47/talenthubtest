# Database Reset Guide

This guide explains how to reset all user progress data (points, scores, attempts, badges) while preserving user accounts and administrative data.

## ⚠️ Warning

**This operation is IRREVERSIBLE!** All progress data will be permanently deleted:
- All practice sessions and attempts
- All paper attempts
- All badges and rewards
- All user points, streaks, and statistics
- All leaderboard data

**This will NOT delete:**
- User accounts
- Student profiles
- Attendance records
- Class sessions
- Fee data
- Certificates

## Method 1: Using the Python Script (Recommended)

### Step 1: Navigate to the backend directory

```bash
cd backend
```

### Step 2: Run the reset script

```bash
python reset_progress_data.py
```

### Step 3: Confirm the reset

The script will ask you to type `RESET` to confirm. Type exactly `RESET` (all caps) to proceed.

### Example Output

```
============================================================
DATABASE PROGRESS RESET SCRIPT
============================================================
============================================================
⚠️  WARNING: DATABASE RESET
============================================================

This will DELETE ALL progress data:
   • All practice sessions and attempts
   • All paper attempts
   • All badges and rewards
   • All user points, streaks, and stats
   • All leaderboard data

Type 'RESET' to confirm: RESET

🔄 Starting database reset...
============================================================

1️⃣ Deleting all practice sessions and attempts...
   ✅ Deleted 1234 practice sessions

2️⃣ Deleting all paper attempts...
   ✅ Deleted 567 paper attempts

3️⃣ Deleting all badges and rewards...
   ✅ Deleted 890 rewards/badges

4️⃣ Resetting all user statistics...
   ✅ Reset stats for 100 users

5️⃣ Resetting leaderboard...
   ✅ Reset 100 leaderboard entries

💾 Committing changes to database...
   ✅ All changes committed successfully!

============================================================
✅ Database reset completed successfully!
============================================================
```

## Method 2: Using the Admin API Endpoint

If you prefer to reset via the API:

### Step 1: Make sure you're logged in as an admin

### Step 2: Send a POST request to the reset endpoint

```bash
curl -X POST "http://localhost:8000/api/users/admin/reset-progress" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

Or using JavaScript/fetch:

```javascript
const response = await fetch('/api/users/admin/reset-progress', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const result = await response.json();
console.log(result);
```

### Response Example

```json
{
  "message": "All progress data reset successfully",
  "summary": {
    "practice_sessions_deleted": 1234,
    "paper_attempts_deleted": 567,
    "rewards_deleted": 890,
    "users_reset": 100,
    "leaderboard_entries_reset": 100
  }
}
```

## What Gets Reset

### User Table
- `total_points` → 0
- `current_streak` → 0
- `longest_streak` → 0
- `last_practice_date` → NULL
- `total_questions_attempted` → 0
- `last_grace_skip_date` → NULL
- `grace_skip_week_start` → NULL
- `last_daily_login_bonus_date` → NULL

### Deleted Tables
- **practice_sessions** - All rows deleted
- **attempts** - All rows deleted (cascade from sessions)
- **paper_attempts** - All rows deleted
- **rewards** - All rows deleted

### Leaderboard Table
- `total_points` → 0
- `weekly_points` → 0
- `rank` → NULL
- `weekly_rank` → NULL

## What is Preserved

- ✅ User accounts (email, name, role, etc.)
- ✅ Student profiles (public_id, course, branch, level, etc.)
- ✅ Attendance records
- ✅ Class sessions
- ✅ Class schedules
- ✅ Fee plans and assignments
- ✅ Fee transactions
- ✅ Certificates
- ✅ Profile audit logs

## Troubleshooting

### Error: "Module not found"
Make sure you're running the script from the `backend` directory and all dependencies are installed:

```bash
pip install -r requirements.txt
```

### Error: "Database connection failed"
Check your `.env` file and ensure `DATABASE_URL` is set correctly.

### Error: "Permission denied"
Make sure you're using an admin account when using the API endpoint.

## Safety Tips

1. **Backup First**: Before running the reset, consider backing up your database:
   ```bash
   # PostgreSQL
   pg_dump your_database > backup.sql
   
   # SQLite
   cp abacus_replitt.db abacus_replitt.db.backup
   ```

2. **Test Environment**: If possible, test the reset on a development/staging database first.

3. **Notify Users**: Inform users that their progress will be reset before performing the operation.

## Need Help?

If you encounter any issues, check:
- Database connection settings in `.env`
- Admin role permissions
- Database logs for detailed error messages
