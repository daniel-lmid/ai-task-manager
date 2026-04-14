import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { TaskApiService } from './tasks/task-api.service';
import { CreateTaskRequest, Task } from './tasks/task.model';
import { TaskCreateComponent } from './tasks/task-create/task-create.component';
import { TaskListComponent } from './tasks/task-list/task-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, TaskCreateComponent, TaskListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  tasks: Task[] = [];
  loading = false;
  error: string | null = null;
  editTaskId: number | null = null;
  selectedTask: any = null;

  
  constructor(private readonly api: TaskApiService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.error = null;

    this.api
      .list()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (tasks) => (this.tasks = tasks),
        error: () => (this.error = 'Failed to load tasks. Is the backend running?'),
      });
  }

  onSave(payload: CreateTaskRequest): void {
    this.error = null;
    this.api.create(payload).subscribe({
      next: (created) => (this.tasks = [created, ...this.tasks]),
      error: () => (this.error = 'Failed to save task.'),
    });
  }

  onDelete(id: number): void {
    this.error = null;
    this.api.delete(id).subscribe({
      next: () => (this.tasks = this.tasks.filter((t) => t.id !== id)),
      error: () => (this.error = 'Failed to delete task.'),
    });
  }

  onToggleComplete(id: number): void {
    this.error = null;
    this.api.toggleComplete(id).subscribe({
      next: (updated) =>
        (this.tasks = this.tasks.map((t) => (t.id === id ? updated : t))),
      error: () => (this.error = 'Failed to update task.'),
      
    });
  }

  onUpdate(data: any): void {
    this.api.update(data.id, {
      title: data.title,
      description: data.description
    }).subscribe({
      next: (updated: Task) => {
         console.log("UPDATED FROM API:", updated);
        this.tasks = this.tasks.map(t =>
          t.id === updated.id ? updated : t
        );
      },
      error: () => (this.error = 'Failed to update task.')
    });
  }
}
