package com.taskmanager.app.repository;

import com.taskmanager.app.models.Task;
import com.taskmanager.app.service.TaskService;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
}