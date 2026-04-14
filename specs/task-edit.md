# Feature: Edit Task

## Goal
Allow users to update an existing task.

## Requirements

### Backend
- Add endpoint: PUT /api/tasks/{id}
- Request body:
  - title (string)
  - description (string)
- Update existing task by id
- Return updated task

### Frontend
- Add Edit button to each task
- Allow editing:
  - title
  - description
- Call PUT /api/tasks/{id}
- Update UI after successful response

## Success Criteria
- User can edit a task
- Changes are persisted in database
- UI reflects updated data immediately