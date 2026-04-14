package com.taskmanager.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskmanager.app.models.Task;
import com.taskmanager.app.service.TaskService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(TaskController.class)
public class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskService taskService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * =========================
     * TEST GET ALL TASKS
     * =========================
     */
    @Test
    void shouldReturnAllTasks() throws Exception {
        Task task = new Task();
        task.setId(1L);
        task.setTitle("Test Task");

        Mockito.when(taskService.getAllTasks()).thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Test Task"));
    }

    /**
     * =========================
     * TEST CREATE TASK
     * =========================
     */
    @Test
    void shouldCreateTask() throws Exception {
        Task task = new Task();
        task.setTitle("New Task");

        Mockito.when(taskService.createTask(Mockito.any(Task.class)))
                .thenReturn(task);

        mockMvc.perform(post("/api/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Task"));
    }

    /**
     * =========================
     * TEST DELETE TASK
     * =========================
     */
    @Test
    void shouldDeleteTask() throws Exception {
        mockMvc.perform(delete("/api/tasks/1"))
                .andExpect(status().isOk());
    }

    /**
     * =========================
     * TEST TOGGLE COMPLETE
     * =========================
     */
    @Test
    void shouldToggleComplete() throws Exception {
        Task task = new Task();
        task.setId(1L);

        Mockito.when(taskService.toggleComplete(1L)).thenReturn(task);

        mockMvc.perform(patch("/api/tasks/1/complete"))
                .andExpect(status().isOk());
    }

    /**
     * =========================
     * TEST UPDATE TASK
     * =========================
     */
    @Test
    void shouldUpdateTask() throws Exception {
        Task task = new Task();
        task.setTitle("Updated");

        Mockito.when(taskService.updateTask(Mockito.eq(1L), Mockito.any(Task.class)))
                .thenReturn(task);

        mockMvc.perform(put("/api/tasks/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated"));
    }
}