import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  standalone: true,
  selector: 'app-task-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.component.html',
  styleUrls: ['./task-list.component.scss']
})
export class TaskListComponent {

  @Input() tasks: any[] = [];

  @Output() delete = new EventEmitter<number>();
  @Output() toggleComplete = new EventEmitter<number>();
  @Output() update = new EventEmitter<any>();

  editingId: number | null = null;

  editTitle = '';
  editDescription = '';

  startEdit(task: any) {
    this.editingId = task.id;
    this.editTitle = task.title;
    this.editDescription = task.description;
  }

  cancelEdit() {
    this.editingId = null;
  }

  saveEdit(task: any) {
    this.update.emit({
      id: task.id,
      title: this.editTitle,
      description: this.editDescription
    });

    this.editingId = null;
  }

  onDelete(id: number) {
    this.delete.emit(id);
  }

  onToggle(id: number) {
    this.toggleComplete.emit(id);
  }
}