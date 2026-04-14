package com.taskmanager.app.models;
import com.taskmanager.app.models.Task;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

public class TaskTest {

    @Test
    public void testConstructor() {
        Task task = new Task();
        assertNotNull(task);
    }

    @Test
    public void testGettersAndSetters() {
        Task task = new Task();
        task.setId(1L);
        assertEquals(1L, task.getId());

        task.setTitle("Sample Title");
        assertEquals("Sample Title", task.getTitle());

        task.setDescription("Sample Description");
        assertEquals("Sample Description", task.getDescription());
    }
}
