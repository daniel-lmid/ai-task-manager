# Feature: Task Creation

## Goal
Allow users to create a new task with a title and description.

## Requirements
- **Backend:** Create a POST endpoint `/api/tasks` that accepts a JSON body (title, description).
- **Frontend:** Create an Angular form component with validation (Title is required).
- **Style:** Use BEM for SCSS styling as per `agent.md`.

## Success Criteria
- Clicking "Save" calls the Java API.
- The new task appears in an Angular list component.