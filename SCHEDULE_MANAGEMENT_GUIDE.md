# Schedule Management Guide

This guide explains the new schedule management functionality that allows admins to create complete schedule templates and assign them to specific days of the week.

## Overview

The enhanced schedule system allows you to:
- Create complete schedule templates with multiple time slots
- Assign templates to specific days of the week
- Generate daily schedules automatically from templates
- Manage and edit existing schedule templates
- Delete templates when no longer needed

## Database Changes

### New Tables and Columns

1. **Enhanced `schedule_templates` table**:
   - `template_name`: Name of the schedule template (e.g., "Weekday Schedule")
   - `days_of_week`: Array of integers (0-6) representing assigned days
   - `is_active`: Boolean to enable/disable the template
   - `description`: Optional description of the template

2. **New `schedule_template_items` table**:
   - `template_id`: References the parent template
   - `time`: Time for the schedule item (HH:MM format)
   - `title`: Title of the schedule item
   - `description`: Optional description
   - `sort_order`: Order of items within the template

### Database Functions

- `generate_daily_schedule_from_templates(target_date, target_household_id)`: Generates schedule items for a specific date
- `generate_schedule_for_date_range(start_date, end_date, target_household_id)`: Generates schedule items for a date range

## How to Use

### 1. Creating Schedule Templates

1. Go to the Admin Dashboard
2. Navigate to the Schedule Management section
3. Click "Create Template" in the Schedule Templates section
4. Fill in the template details:
   - **Template Name**: Give your template a descriptive name (e.g., "Weekday Schedule", "Weekend Schedule")
   - **Description**: Optional description of what this template is for
   - **Assign to Days**: Select which days of the week this template should apply to
   - **Schedule Items**: Add multiple time slots with titles and descriptions

### 2. Managing Templates

- **View Templates**: See all your created templates with their assigned days and schedule items
- **Edit Templates**: Click the edit button to modify template details or schedule items
- **Delete Templates**: Remove templates that are no longer needed
- **Generate Schedules**: Use the "Generate" button to create daily schedule items from templates

### 3. Generating Schedules

There are several ways to generate schedules:

#### From the Admin Dashboard:
- Use the "Generate" button next to each template to create schedules for the next week

#### From the Dashboard :
(Not Active)
- Use "This Week" button to generate schedules for the current week
- Use "Next Week" button to generate schedules for the upcoming week

### 4. Day of Week Assignment

The system uses a day-of-week picker where:
- **0** = Sunday
- **1** = Monday
- **2** = Tuesday
- **3** = Wednesday
- **4** = Thursday
- **5** = Friday
- **6** = Saturday

You can assign templates to:
- Individual days (e.g., just Monday)
- Multiple days (e.g., Monday, Wednesday, Friday)
- Weekdays (Monday-Friday)
- Weekends (Saturday-Sunday)
- Every day of the week

## Example Workflows

### Creating a Weekday Schedule

1. Create a new template called "Weekday Schedule"
2. Assign it to Monday, Tuesday, Wednesday, Thursday, Friday
3. Add schedule items like:
   - 8:00 AM - Morning Meeting
   - 12:00 PM - Lunch Break
   - 2:00 PM - Afternoon Check-in
   - 5:00 PM - End of Day Wrap-up
4. Save the template
5. Generate schedules for the week

### Creating a Weekend Schedule

1. Create a new template called "Weekend Schedule"
2. Assign it to Saturday and Sunday
3. Add schedule items like:
   - 9:00 AM - Family Breakfast
   - 10:00 AM - Chores
   - 2:00 PM - Family Activity
   - 6:00 PM - Dinner
4. Save the template
5. Generate schedules for the weekend

## Technical Details

### Components

- **ScheduleTemplateForm**: Form for creating/editing schedule templates
- **ScheduleTemplateManagement**: Main management interface for templates
- **ScheduleManagement**: Updated to include template management
- **SchedulePanel**: Updated with schedule generation buttons

### Utilities

- **scheduleUtils.ts**: Helper functions for generating schedules
- **DayOfWeekPicker**: Reusable component for selecting days of the week

### Database Migration

Run the SQL migration file `supabase/migrations/001_schedule_templates_enhancement.sql` to set up the new database structure.

## Benefits

1. **One-Time Setup**: Create templates once and reuse them
2. **Flexible Assignment**: Assign different schedules to different days
3. **Easy Management**: Edit or delete templates as needed
4. **Automatic Generation**: Generate daily schedules with one click
5. **Consistent Scheduling**: Ensure consistent schedules across days

## Troubleshooting

### Common Issues

1. **No schedules appearing**: Make sure you've generated schedules from your templates
2. **Wrong days assigned**: Check the day-of-week assignment in your template
3. **Missing schedule items**: Verify that your template has schedule items added
4. **Database errors**: Ensure the migration has been run successfully

### Getting Help

If you encounter issues:
1. Check the browser console for error messages
2. Verify that the database migration was successful
3. Ensure you have the proper permissions to manage schedules
4. Check that your household is properly set up

## Future Enhancements

Potential future improvements could include:
- Recurring schedule patterns (every other week, monthly, etc.)
- Schedule conflicts detection
- Template sharing between households
- Schedule analytics and reporting
- Integration with calendar applications
