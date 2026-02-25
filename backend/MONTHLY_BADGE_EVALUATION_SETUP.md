# Monthly Badge Evaluation Setup

This document explains how to set up automated monthly badge evaluation using cron jobs.

## Overview

The reward system requires monthly evaluation to award badges for:
- **Attendance Champion**: 100% attendance for the month
- **Gold T-Shirt Star**: All classes with T-shirt worn
- **Leaderboard Badges**: Top 3 students for the month

## Manual Execution

You can manually run the evaluation script:

```bash
cd backend
python monthly_badge_evaluation.py [year] [month]
```

If year and month are not provided, it evaluates the previous month.

Example:
```bash
# Evaluate previous month
python monthly_badge_evaluation.py

# Evaluate specific month
python monthly_badge_evaluation.py 2024 12
```

## Admin API Endpoint

Admins can also trigger evaluation via API:

```bash
POST /users/admin/rewards/evaluate-monthly?year=2024&month=12
```

If year and month are not provided, it evaluates the previous month.

## Cron Job Setup

### Linux/macOS

Add to crontab (`crontab -e`):

```cron
# Run monthly badge evaluation on the 1st of each month at 2:00 AM IST
0 2 1 * * cd /path/to/hi-main/backend && /usr/bin/python3 monthly_badge_evaluation.py
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Monthly, 1st day of month, 2:00 AM
4. Action: Start a program
   - Program: `python`
   - Arguments: `monthly_badge_evaluation.py`
   - Start in: `C:\path\to\hi-main\backend`

### Docker/Container

If running in a container, you can use a cron container or a scheduler service:

```yaml
# docker-compose.yml example
services:
  cron:
    image: your-backend-image
    command: >
      sh -c "
        echo '0 2 1 * * cd /app/backend && python monthly_badge_evaluation.py' | crontab -
        crond -f
      "
    volumes:
      - ./backend:/app/backend
```

### Cloud Platforms

#### Railway
Use Railway's Cron Jobs feature or a scheduled worker.

#### Heroku
Use Heroku Scheduler add-on:
```
$ heroku addons:create scheduler:standard
$ heroku addons:open scheduler
```

Add job:
- Command: `cd backend && python monthly_badge_evaluation.py`
- Frequency: Monthly, 1st of month

#### AWS
Use EventBridge (CloudWatch Events) to trigger a Lambda function or ECS task.

## What Gets Evaluated

1. **Attendance Badges**: Checks all active students for 100% attendance in the month
2. **T-Shirt Star Badges**: Checks if students wore T-shirt to all classes
3. **Leaderboard Badges**: Awards top 3 students based on monthly points

## Notes

- The script is idempotent - safe to run multiple times
- Badges are only awarded once per month per student
- Previous month badges remain in history but don't show as "current"
- Lifetime badges are never reset

## Testing

Test the evaluation manually before setting up cron:

```bash
# Test with a specific month
python monthly_badge_evaluation.py 2024 1

# Check logs for any errors
# Verify badges were awarded in database
```

## Troubleshooting

1. **Import errors**: Ensure you're in the backend directory and all dependencies are installed
2. **Database errors**: Check database connection and permissions
3. **Timezone issues**: Script uses IST timezone - ensure server timezone is correct
4. **No badges awarded**: Check if students met criteria (attendance, T-shirt, leaderboard position)
