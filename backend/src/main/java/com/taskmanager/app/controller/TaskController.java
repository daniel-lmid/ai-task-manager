package com.taskmanager.app.controller;

import com.taskmanager.app.models.Task;
import com.taskmanager.app.service.TaskService;
import com.taskmanager.app.repository.TaskRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * =========================
     * GET ALL TASKS
     * =========================
     */
    @GetMapping
    public List<Task> getAllTasks() {
        return taskService.getAllTasks();
    }

    /**
     * =========================
     * CREATE TASK
     * =========================
     */
    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskService.createTask(task);
    }

    /**
     * =========================
     * DELETE TASK
     * =========================
     */
    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
    }

    /**
     * =========================
     * TOGGLE COMPLETE
     * =========================
     */
    @PatchMapping("/{id}/complete")
    public Task toggleComplete(@PathVariable Long id) {
        return taskService.toggleComplete(id);
    }

    /**
     * =========================
     * UPDATE TASK (EDIT FEATURE)
     * =========================
     */
    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task updatedTask) {
        return taskService.updateTask(id, updatedTask);
    }
}