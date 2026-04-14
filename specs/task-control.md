# Feature: Task Lifecycle Controls

## Goal
Allow users to delete tasks and mark them as complete.

## Requirements
- **Backend:** 
  - Add `DELETE /api/tasks/{id}` to remove a task.
  - Add `PATCH /api/tasks/{id}/complete` to toggle the completion status.
- **Frontend:** 
  - Add a "Delete" button to each task in the list.
  - Add a "Complete" toggle/button that visually strikes through the task title.
- **Rules:** Follow coding standards in `agent.md`.

## Success Criteria
- Deleting a task removes it from the UI and database.
- Clicking "Complete" updates the state in the Java backend.